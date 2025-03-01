import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import SendBird from 'sendbird';
import { useAuth } from './AuthContext';

// Sendbird App ID
const APP_ID = '203C093A-E0DC-4F42-AC0D-2682A7E606FC';

// Add logging utility
const logDebug = (message: string, ...args: any[]) => {
  console.log(`[Sendbird Debug] ${message}`, ...args);
};

const logError = (message: string, error?: any) => {
  console.error(`[Sendbird Error] ${message}`, error);
};

// Utility for retrying operations with exponential backoff
const withRetry = async <T,>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  backoff = 2
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    // Check if it's a rate limit error
    if (
      error instanceof Error && 
      error.message.includes('Too many requests') && 
      retries > 0
    ) {
      logDebug(`Rate limit hit, retrying in ${delay}ms. Retries left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * backoff, backoff);
    }
    throw error;
  }
};

// Cache for channel lookups to reduce API calls
interface ChannelCache {
  [key: string]: {
    channel: SendBird.GroupChannel;
    timestamp: number;
  };
}

interface SendbirdContextType {
  sb: SendBird.SendBirdInstance | null;
  currentChannel: SendBird.GroupChannel | null;
  messages: SendBird.UserMessage[];
  loading: boolean;
  error: string | null;
  connectToSendbird: () => Promise<void>;
  disconnectFromSendbird: () => void;
  createChannelWithHost: (hostId: string, channelName: string) => Promise<SendBird.GroupChannel>;
  findOrCreateChannel: (hostId: string, channelName: string) => Promise<SendBird.GroupChannel>;
  sendMessage: (text: string) => Promise<SendBird.UserMessage | null>;
  loadMessages: (channelUrl: string) => Promise<void>;
  refreshMessages: (channelUrl: string) => Promise<void>;
  getChannelList: () => Promise<SendBird.GroupChannel[]>;
  refreshChannelList: () => Promise<SendBird.GroupChannel[]>;
}

const SendbirdContext = createContext<SendbirdContextType | undefined>(undefined);

export function SendbirdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sb, setSb] = useState<SendBird.SendBirdInstance | null>(null);
  const [currentChannel, setCurrentChannel] = useState<SendBird.GroupChannel | null>(null);
  const [messages, setMessages] = useState<SendBird.UserMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Use refs for values that don't need to trigger re-renders
  const channelCacheRef = useRef<ChannelCache>({});
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlerIdsRef = useRef<string[]>([]);
  
  // Clear the channel cache periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cache = channelCacheRef.current;
      
      // Remove entries older than 5 minutes
      Object.keys(cache).forEach(key => {
        if (now - cache[key].timestamp > 5 * 60 * 1000) {
          delete cache[key];
        }
      });
      
      logDebug('Cleaned channel cache, remaining entries:', Object.keys(cache).length);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Initialize Sendbird
  useEffect(() => {
    const sbInstance = new SendBird({ appId: APP_ID });
    logDebug('Initializing Sendbird instance');
    setSb(sbInstance);

    return () => {
      if (sbInstance) {
        logDebug('Cleaning up Sendbird instance');
        
        // Clean up all handlers
        handlerIdsRef.current.forEach(id => {
          sbInstance.removeChannelHandler(id);
        });
        handlerIdsRef.current = [];
        
        sbInstance.removeAllConnectionHandlers();
        
        // Disconnect gracefully
        if (isConnected) {
          sbInstance.disconnect(() => {
            logDebug('Disconnected from Sendbird');
            setIsConnected(false);
          });
        }
      }
      
      // Clear any pending connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
  }, [isConnected]);

  // Update user ID generation logic to ensure consistency
  const generateValidUserId = (user: any): string => {
    if (!user) {
      logError('Cannot generate user ID: User object is null or undefined');
      return '';
    }
    
    if (user.email) {
      logDebug('Generating user ID from email:', user.email);
      return user.email.toLowerCase()
        .replace(/@/g, '_at_')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    if (user.sub) {
      logDebug('Generating user ID from sub:', user.sub);
      return user.sub.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    logError('No email or sub found in user object:', user);
    return '';
  };

  // Connect to Sendbird when user is authenticated
  const connectToSendbird = async () => {
    if (!sb) {
      const error = 'Cannot connect to chat: Sendbird not initialized';
      logError(error);
      setError(error);
      throw new Error(error);
    }
    
    if (!user) {
      const error = 'Cannot connect to chat: User not authenticated';
      logError(error);
      setError(error);
      throw new Error(error);
    }
    
    // If already connected, return immediately
    if (isConnected) {
      logDebug('Already connected to Sendbird, skipping connection');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logDebug('Connecting with user object:', { 
        sub: user.sub, 
        email: user.email, 
        name: user.name 
      });
      
      const userId = generateValidUserId(user);
      if (!userId) {
        throw new Error('Failed to generate valid user ID');
      }
      
      logDebug('Generated Sendbird user ID:', userId);

      // Connect user to Sendbird with timeout
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          sb.connect(userId, (user, error) => {
            if (error) {
              logError('Sendbird connection error:', error);
              reject(error);
            } else {
              logDebug('Connected to Sendbird successfully:', user);
              setIsConnected(true);
              resolve();
            }
          });
        }),
        new Promise<void>((_, reject) => {
          connectionTimeoutRef.current = setTimeout(() => {
            connectionTimeoutRef.current = null;
            reject(new Error('Connection timeout after 10 seconds'));
          }, 10000);
        })
      ]);
      
      // Clear timeout if connection was successful
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      // Add channel handler for real-time updates
      const channelHandler = new sb.ChannelHandler();
      
      // Handle incoming messages (real-time via WebSockets)
      channelHandler.onMessageReceived = (channel, message) => {
        // Check if this is a group channel by checking for properties specific to GroupChannel
        if (!('members' in channel) || !('memberCount' in channel)) {
          return;
        }
        
        // Safe to treat as GroupChannel now
        const groupChannel = channel as SendBird.GroupChannel;
        
        logDebug('WebSocket: Message received in channel:', { 
          channelUrl: groupChannel.url, 
          messageType: message.messageType,
          sender: message.messageType === 'user' || message.messageType === 'file' 
            ? (message as SendBird.UserMessage | SendBird.FileMessage).sender?.userId 
            : 'system',
          currentChannelUrl: currentChannel?.url
        });
        
        // Update messages if we're in the current channel
        if (groupChannel.url === currentChannel?.url) {
          if (message.messageType === 'user') {
            setMessages(prev => [...prev, message as SendBird.UserMessage]);
          } else if (message.messageType === 'admin') {
            // Handle admin messages if needed
            logDebug('Admin message received:', message);
          } else if (message.messageType === 'file') {
            // Handle file messages if needed
            logDebug('File message received:', message);
          }
        }
      };
      
      // Handle channel updates (real-time via WebSockets)
      channelHandler.onChannelChanged = (channel) => {
        // Check if this is a group channel by checking for properties specific to GroupChannel
        if (!('members' in channel) || !('memberCount' in channel)) {
          return;
        }
        
        // Safe to treat as GroupChannel now
        const groupChannel = channel as SendBird.GroupChannel;
        
        logDebug('WebSocket: Channel changed:', groupChannel.url);
        
        // Update channel cache
        if (channelCacheRef.current[groupChannel.url]) {
          channelCacheRef.current[groupChannel.url] = {
            channel: groupChannel,
            timestamp: Date.now()
          };
        }
        
        // If this is the current channel, update the current channel state
        if (groupChannel.url === currentChannel?.url) {
          setCurrentChannel(groupChannel);
        }
      };
      
      // Handle messages being updated (real-time via WebSockets)
      channelHandler.onMessageUpdated = (channel, message) => {
        // Check if this is a group channel
        if (!('members' in channel) || !('memberCount' in channel)) {
          return;
        }
        
        const groupChannel = channel as SendBird.GroupChannel;
        
        logDebug('WebSocket: Message updated in channel:', { 
          channelUrl: groupChannel.url, 
          messageId: message.messageId,
          currentChannelUrl: currentChannel?.url
        });
        
        // Update the message in our state if we're in the current channel
        if (groupChannel.url === currentChannel?.url && message.messageType === 'user') {
          setMessages(prev => 
            prev.map(msg => 
              msg.messageId === message.messageId ? message as SendBird.UserMessage : msg
            )
          );
        }
      };
      
      // Handle messages being deleted (real-time via WebSockets)
      channelHandler.onMessageDeleted = (channel, messageId) => {
        // Check if this is a group channel
        if (!('members' in channel) || !('memberCount' in channel)) {
          return;
        }
        
        const groupChannel = channel as SendBird.GroupChannel;
        
        logDebug('WebSocket: Message deleted in channel:', { 
          channelUrl: groupChannel.url, 
          messageId,
          currentChannelUrl: currentChannel?.url
        });
        
        // Remove the message from our state if we're in the current channel
        if (groupChannel.url === currentChannel?.url) {
          setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
        }
      };
      
      // Handle read receipts (real-time via WebSockets)
      channelHandler.onReadReceiptUpdated = (channel) => {
        // Check if this is a group channel
        if (!('members' in channel) || !('memberCount' in channel)) {
          return;
        }
        
        const groupChannel = channel as SendBird.GroupChannel;
        
        logDebug('WebSocket: Read receipt updated in channel:', { 
          channelUrl: groupChannel.url,
          currentChannelUrl: currentChannel?.url
        });
        
        // Update the channel in our cache
        if (channelCacheRef.current[groupChannel.url]) {
          channelCacheRef.current[groupChannel.url] = {
            channel: groupChannel,
            timestamp: Date.now()
          };
        }
        
        // If this is the current channel, update the current channel state
        if (groupChannel.url === currentChannel?.url) {
          setCurrentChannel(groupChannel);
        }
      };
      
      // Handle typing indicators (real-time via WebSockets)
      channelHandler.onTypingStatusUpdated = (channel) => {
        // Check if this is a group channel
        if (!('members' in channel) || !('memberCount' in channel)) {
          return;
        }
        
        const groupChannel = channel as SendBird.GroupChannel;
        
        logDebug('WebSocket: Typing status updated in channel:', { 
          channelUrl: groupChannel.url,
          typingUsers: groupChannel.getTypingMembers().map(m => m.userId),
          currentChannelUrl: currentChannel?.url
        });
        
        // If this is the current channel, update the current channel state
        if (groupChannel.url === currentChannel?.url) {
          setCurrentChannel(groupChannel);
        }
      };

      // Add connection handler
      const connectionHandler = new sb.ConnectionHandler();
      connectionHandler.onReconnectStarted = () => {
        logDebug('Reconnection started');
      };
      connectionHandler.onReconnectSucceeded = () => {
        logDebug('Reconnection succeeded');
        setIsConnected(true);
      };
      connectionHandler.onReconnectFailed = () => {
        logError('Reconnection failed');
        setIsConnected(false);
        setError('Lost connection to chat service. Please try again.');
      };
      
      // Note: onDisconnected is not part of the ConnectionHandler interface
      // We'll handle disconnection through the disconnect callback instead

      // Register handlers with a unique ID based on the user
      const handlerId = `channel_handler_${userId}_${Date.now()}`;
      sb.removeChannelHandler(handlerId); // Remove any existing handler
      sb.addChannelHandler(handlerId, channelHandler);
      handlerIdsRef.current.push(handlerId);

      // Add connection handler with unique ID
      const connectionHandlerId = `connection_handler_${userId}_${Date.now()}`;
      sb.removeConnectionHandler(connectionHandlerId);
      sb.addConnectionHandler(connectionHandlerId, connectionHandler);
      handlerIdsRef.current.push(connectionHandlerId);

      // Update user information with validation
      const nickname = user.name || userId;
      const profileUrl = user.picture || '';
      
      logDebug('Updating user info:', { nickname, profileUrl });
      
      await new Promise<void>((resolve, reject) => {
        // Ensure nickname is a string and not empty
        if (typeof nickname !== 'string' || !nickname.trim()) {
          logError('Invalid nickname:', nickname);
          reject(new Error('Invalid nickname'));
          return;
        }

        // Ensure profile URL is a string (can be empty)
        if (profileUrl && typeof profileUrl !== 'string') {
          logError('Invalid profile URL:', profileUrl);
          reject(new Error('Invalid profile URL'));
          return;
        }

        sb.updateCurrentUserInfo(nickname, profileUrl, (user, error) => {
          if (error) {
            logError('Failed to update user info:', error);
            reject(error);
          } else {
            logDebug('Updated user info successfully:', user);
            resolve();
          }
        });
      });

      logDebug('Connected to Sendbird as:', nickname);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to chat service';
      logError(errorMessage, err);
      setError(errorMessage);
      setIsConnected(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disconnectFromSendbird = () => {
    if (sb && isConnected) {
      logDebug('Disconnecting from Sendbird');
      sb.disconnect(() => {
        logDebug('Disconnected from Sendbird');
        setIsConnected(false);
      });
    }
  };

  // Update channel creation logic to ensure correct user IDs are used
  const createChannelWithHost = async (hostId: string, channelName: string): Promise<SendBird.GroupChannel> => {
    if (!sb) {
      const error = 'Cannot create channel: Sendbird not initialized';
      logError(error);
      throw new Error(error);
    }
    
    if (!user) {
      const error = 'Cannot create channel: User not authenticated';
      logError(error);
      throw new Error(error);
    }
    
    if (!isConnected) {
      logDebug('Not connected to Sendbird, connecting first');
      await connectToSendbird();
    }

    setLoading(true);
    setError(null);

    try {
      // Generate user IDs consistently using email
      const currentUserId = generateValidUserId(user);
      if (!currentUserId) {
        throw new Error('Failed to generate valid user ID for current user');
      }
      
      // Use the actual host email without modification
      const hostEmail = hostId;
      const hostUserId = generateValidUserId({ email: hostEmail });
      if (!hostUserId) {
        throw new Error('Failed to generate valid user ID for host');
      }

      logDebug('Creating channel with users:', {
        currentUserId,
        hostUserId,
        hostEmail,
        channelName
      });

      const channel = await withRetry(async () => {
        return new Promise<SendBird.GroupChannel>((resolve, reject) => {
          const params = new sb.GroupChannelParams();
          params.addUserIds([currentUserId, hostUserId]);
          params.isDistinct = true;
          params.name = channelName;
          params.customType = 'food_experience_chat';
          params.data = JSON.stringify({
            hostId: hostUserId,
            guestId: currentUserId,
            hostEmail: hostEmail,
            createdAt: new Date().toISOString()
          });

          logDebug('Creating channel with params:', {
            userIds: [currentUserId, hostUserId],
            channelName,
            isDistinct: params.isDistinct,
            customType: params.customType,
            data: params.data
          });

          sb.GroupChannel.createChannel(params, (channel, error) => {
            if (error) {
              logError('Error creating channel:', error);
              reject(error);
            } else {
              logDebug('Channel created successfully. Details:', {
                url: channel.url,
                name: channel.name,
                memberCount: channel.memberCount,
                isDistinct: channel.isDistinct,
                data: channel.data,
                members: channel.members.map(m => ({
                  userId: m.userId,
                  nickname: m.nickname,
                  connectionStatus: m.connectionStatus
                }))
              });
              
              // Add to cache
              channelCacheRef.current[channel.url] = {
                channel,
                timestamp: Date.now()
              };
              
              resolve(channel);
            }
          });
        });
      }, 3, 1000, 2);

      setCurrentChannel(channel);
      return channel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create chat with host';
      logError(errorMessage, err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const findOrCreateChannel = async (hostId: string, channelName: string): Promise<SendBird.GroupChannel> => {
    if (!sb) {
      throw new Error('Sendbird not initialized');
    }
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    if (!isConnected) {
      logDebug('Not connected to Sendbird, connecting first');
      await connectToSendbird();
    }

    try {
      // Generate both user IDs consistently using email
      const currentUserId = generateValidUserId(user);
      if (!currentUserId) {
        throw new Error('Failed to generate valid user ID for current user');
      }
      
      // Use the actual host email without modification
      const hostEmail = hostId;
      const hostUserId = generateValidUserId({ email: hostEmail });
      if (!hostUserId) {
        throw new Error('Failed to generate valid user ID for host');
      }

      // Create a cache key for this user pair
      const cacheKey = [currentUserId, hostUserId].sort().join('_');
      
      // Check if we have a cached channel for these users
      const cachedChannels = Object.values(channelCacheRef.current)
        .filter(entry => {
          const channelData = entry.channel.data ? JSON.parse(entry.channel.data) : {};
          return (
            (channelData.hostId === hostUserId && channelData.guestId === currentUserId) ||
            (channelData.hostId === currentUserId && channelData.guestId === hostUserId)
          );
        })
        .map(entry => entry.channel);
      
      if (cachedChannels.length > 0) {
        logDebug('Found channel in cache:', {
          url: cachedChannels[0].url,
          name: cachedChannels[0].name
        });
        return cachedChannels[0];
      }

      logDebug('Searching for channel between users:', {
        currentUserId,
        hostUserId,
        hostEmail,
        channelName
      });
      
      // First try to find an existing channel
      const startTime = Date.now();
      
      const channels = await withRetry(async () => {
        return new Promise<SendBird.GroupChannel[]>((resolve, reject) => {
          const query = sb.GroupChannel.createMyGroupChannelListQuery();
          query.customTypesFilter = ['food_experience_chat'];
          query.includeEmpty = true;
          query.memberStateFilter = 'all';
          query.limit = 100;

          logDebug('Channel query params:', {
            customTypesFilter: query.customTypesFilter,
            includeEmpty: query.includeEmpty,
            memberStateFilter: query.memberStateFilter,
            limit: query.limit
          });

          query.next((channels, error) => {
            if (error) {
              logError('Error querying channels:', error);
              reject(error);
            } else {
              // Log all channels for debugging
              logDebug(`Found ${channels.length} channels in total`);
              resolve(channels);
            }
          });
        });
      }, 3, 1000, 2);

      logDebug(`Channel query completed in ${Date.now() - startTime}ms`);

      // Look for a channel that contains both the current user and the host
      const existingChannel = channels.find(ch => {
        // Check if channel has exactly 2 members
        if (ch.memberCount !== 2) {
          return false;
        }
        
        // Get member IDs
        const memberIds = ch.members.map(m => m.userId);
        
        // Check if channel contains both users
        const hasCurrentUser = memberIds.includes(currentUserId);
        const hasHostUser = memberIds.includes(hostUserId);
        
        return hasCurrentUser && hasHostUser;
      });

      if (existingChannel) {
        logDebug('Found existing channel:', {
          url: existingChannel.url,
          name: existingChannel.name,
          memberCount: existingChannel.memberCount,
          elapsed: Date.now() - startTime
        });
        
        // Add to cache
        channelCacheRef.current[existingChannel.url] = {
          channel: existingChannel,
          timestamp: Date.now()
        };
        
        return existingChannel;
      }

      // If no existing channel, create a new one
      logDebug('No existing channel found, creating new channel');
      
      return await createChannelWithHost(hostId, channelName);
    } catch (err) {
      logError('Error in findOrCreateChannel:', err);
      throw err;
    }
  };

  const sendMessage = async (text: string): Promise<SendBird.UserMessage | null> => {
    if (!sb) {
      const error = 'Cannot send message: Sendbird not initialized';
      logError(error);
      setError(error);
      return null;
    }
    
    if (!currentChannel) {
      const error = 'Cannot send message: No active chat';
      logError(error);
      setError(error);
      return null;
    }
    
    if (!isConnected) {
      logDebug('Not connected to Sendbird, connecting first');
      await connectToSendbird();
    }

    try {
      logDebug('Sending message:', text);
      
      const message = await withRetry(async () => {
        return new Promise<SendBird.UserMessage>((resolve, reject) => {
          const params = new sb.UserMessageParams();
          params.message = text;
          
          currentChannel.sendUserMessage(params, (message, error) => {
            if (error) {
              logError('Error sending message:', error);
              reject(error);
            } else {
              logDebug('Message sent successfully:', message);
              resolve(message);
            }
          });
        });
      }, 3, 1000, 2);

      setMessages(prev => [...prev, message]);
      return message;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      logError(errorMessage, err);
      setError(errorMessage);
      return null;
    }
  };

  const loadMessages = async (channelUrl: string): Promise<void> => {
    if (!sb) {
      const error = 'Cannot load messages: Sendbird not initialized';
      logError(error);
      setError(error);
      throw new Error(error);
    }
    
    if (!isConnected) {
      logDebug('Not connected to Sendbird, connecting first');
      await connectToSendbird();
    }

    setLoading(true);
    setError(null);
    
    // Clear messages state immediately to prevent showing previous messages
    // This ensures when switching hosts, we don't see the previous host's messages
    setMessages([]);
    logDebug('Cleared messages state before loading new messages');

    try {
      logDebug('Loading messages for channel:', channelUrl);
      
      // Check if channel is in cache
      let channel: SendBird.GroupChannel;
      if (channelCacheRef.current[channelUrl]) {
        channel = channelCacheRef.current[channelUrl].channel;
        logDebug('Using cached channel:', channelUrl);
      } else {
        // Get the channel
        logDebug('Looking up channel by URL:', channelUrl);
        const startTime = Date.now();
        
        // Use explicit type assertion for GroupChannel
        const retrievedChannel = await withRetry(async () => {
          return new Promise<SendBird.BaseChannel>((resolve, reject) => {
            sb.GroupChannel.getChannel(channelUrl, (channel, error) => {
              if (error) {
                logError('Error getting channel by URL:', error);
                reject(error);
              } else {
                logDebug('Channel retrieved successfully by URL:', {
                  channelUrl: channel.url,
                  name: channel.name,
                  memberCount: (channel as SendBird.GroupChannel).memberCount,
                  elapsed: Date.now() - startTime
                });
                
                resolve(channel);
              }
            });
          });
        }, 3, 1000, 2);
        
        // Ensure we have a GroupChannel
        if (!('members' in retrievedChannel) || !('memberCount' in retrievedChannel)) {
          throw new Error('Retrieved channel is not a GroupChannel');
        }
        
        channel = retrievedChannel as SendBird.GroupChannel;
        
        // Add to cache
        channelCacheRef.current[channel.url] = {
          channel,
          timestamp: Date.now()
        };
      }

      setCurrentChannel(channel);
      logDebug('Current channel set:', channel.url);

      // Load messages
      logDebug('Creating message list query for channel:', channel.url);
      const messageLoadStartTime = Date.now();
      
      const messageList = await withRetry(async () => {
        return new Promise<SendBird.UserMessage[]>((resolve, reject) => {
          const messageListQuery = channel.createPreviousMessageListQuery();
          messageListQuery.limit = 50; // Increase limit to get more messages initially
          messageListQuery.reverse = true;
          
          logDebug('Message list query created with params:', {
            limit: messageListQuery.limit,
            reverse: messageListQuery.reverse
          });
          
          messageListQuery.load((messages, error) => {
            if (error) {
              logError('Error loading messages:', error);
              reject(error);
            } else {
              logDebug('Raw messages loaded:', {
                count: messages.length,
                types: messages.map(m => m.messageType),
                elapsed: Date.now() - messageLoadStartTime
              });
              
              // Filter to only user messages
              const userMessages = messages.filter(
                msg => msg.messageType === 'user'
              ) as SendBird.UserMessage[];
              
              // Deduplicate messages by messageId
              const uniqueMessages: SendBird.UserMessage[] = [];
              const seenMessageIds = new Set<number>();
              
              userMessages.forEach(message => {
                if (!seenMessageIds.has(message.messageId)) {
                  seenMessageIds.add(message.messageId);
                  uniqueMessages.push(message);
                } else {
                  logDebug('Duplicate message detected during initial load:', message.messageId);
                }
              });
              
              // Sort by creation time
              uniqueMessages.sort((a, b) => a.createdAt - b.createdAt);
              
              logDebug('Processed messages:', {
                totalCount: messages.length,
                userMessageCount: userMessages.length,
                uniqueMessageCount: uniqueMessages.length,
                messageIds: uniqueMessages.map(m => m.messageId)
              });
              
              resolve(uniqueMessages);
            }
          });
        });
      }, 3, 1000, 2);

      logDebug('Setting messages state with count:', messageList.length);
      setMessages(messageList);
      logDebug('Messages state set successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      logError(errorMessage, err);
      setError(errorMessage);
      throw err;
    } finally {
      logDebug('Finished loadMessages operation, setting loading to false');
      setLoading(false);
    }
  };

  // Add a function to refresh messages without replacing the entire message list
  const refreshMessages = async (channelUrl: string): Promise<void> => {
    if (!sb) {
      throw new Error('Sendbird not initialized');
    }
    
    if (!isConnected) {
      logDebug('Not connected to Sendbird, connecting first');
      await connectToSendbird();
    }
    
    try {
      logDebug('Loading messages for channel:', channelUrl);
      
      // Get the channel from cache or fetch it
      let channel: SendBird.GroupChannel;
      
      if (channelCacheRef.current[channelUrl]) {
        channel = channelCacheRef.current[channelUrl].channel;
        logDebug('Using cached channel:', channelUrl);
      } else {
        channel = await new Promise<SendBird.GroupChannel>((resolve, reject) => {
          sb.GroupChannel.getChannel(channelUrl, (groupChannel, error) => {
            if (error) {
              logError('Error getting channel:', error);
              reject(error);
            } else {
              // Add to cache
              channelCacheRef.current[channelUrl] = {
                channel: groupChannel,
                timestamp: Date.now()
              };
              resolve(groupChannel);
            }
          });
        });
      }
      
      // Set as current channel
      setCurrentChannel(channel);
      
      // Create a map of existing message IDs for quick lookup
      const existingMessageIds = new Map<number, boolean>();
      messages.forEach(message => {
        existingMessageIds.set(message.messageId, true);
      });
      
      // Get the timestamp of the most recent message
      const latestMessageTimestamp = messages.length > 0 
        ? Math.max(...messages.map(m => m.createdAt))
        : 0;
      
      logDebug('Latest message timestamp:', new Date(latestMessageTimestamp).toISOString());
      
      // Create a query for messages newer than the latest one we have
      const messageListQuery = channel.createPreviousMessageListQuery();
      messageListQuery.limit = 50; // Increase limit to ensure we get all new messages
      messageListQuery.reverse = true;
      
      // Get messages
      const newMessages = await new Promise<SendBird.UserMessage[]>((resolve, reject) => {
        messageListQuery.load((messages, error) => {
          if (error) {
            logError('Error loading messages:', error);
            reject(error);
          } else {
            const startTime = Date.now();
            logDebug('Raw messages loaded:', { 
              count: messages.length, 
              types: messages.map(m => m.messageType),
              elapsed: Date.now() - startTime
            });
            
            // Filter to only user messages
            const userMessages = messages
              .filter(m => m.messageType === 'user') as SendBird.UserMessage[];
            
            // Filter to messages that are newer than our latest AND not already in our list
            const newUserMessages = userMessages.filter(m => 
              m.createdAt > latestMessageTimestamp && 
              !existingMessageIds.has(m.messageId)
            );
            
            logDebug('Filtered to new user messages:', {
              totalCount: messages.length,
              userMessageCount: userMessages.length,
              newMessageCount: newUserMessages.length,
              messageIds: newUserMessages.map(m => m.messageId)
            });
            
            resolve(newUserMessages);
          }
        });
      });
      
      // Append new messages to the existing ones
      if (newMessages.length > 0) {
        setMessages(prev => {
          // Create a new array with all messages
          const combined = [...prev, ...newMessages];
          
          // Deduplicate messages by messageId
          const uniqueMessages: SendBird.UserMessage[] = [];
          const seenMessageIds = new Set<number>();
          
          combined.forEach(message => {
            if (!seenMessageIds.has(message.messageId)) {
              seenMessageIds.add(message.messageId);
              uniqueMessages.push(message);
            }
          });
          
          // Sort by creation time
          uniqueMessages.sort((a, b) => a.createdAt - b.createdAt);
          
          logDebug('Added new messages to state:', {
            newCount: newMessages.length,
            prevCount: prev.length,
            finalCount: uniqueMessages.length
          });
          
          return uniqueMessages;
        });
      } else {
        logDebug('No new messages found');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh messages';
      logError(errorMessage, err);
      setError(errorMessage);
      throw err;
    }
  };

  const getChannelList = async (): Promise<SendBird.GroupChannel[]> => {
    if (!sb) {
      const error = 'Cannot get channels: Sendbird not initialized';
      logError(error);
      setError(error);
      return [];
    }
    
    if (!user) {
      const error = 'Cannot get channels: User not authenticated';
      logError(error);
      setError(error);
      return [];
    }
    
    if (!isConnected) {
      logDebug('Not connected to Sendbird, connecting first');
      await connectToSendbird();
    }

    try {
      const currentUserId = generateValidUserId(user);
      logDebug('Getting channel list for user:', currentUserId);

      const channels = await withRetry(async () => {
        return new Promise<SendBird.GroupChannel[]>((resolve, reject) => {
          const channelListQuery = sb.GroupChannel.createMyGroupChannelListQuery();
          channelListQuery.includeEmpty = true;
          channelListQuery.limit = 100;
          channelListQuery.customTypesFilter = ['food_experience_chat'];
          channelListQuery.order = 'latest_last_message';
          channelListQuery.memberStateFilter = 'all';
          
          logDebug('Channel list query params:', {
            includeEmpty: channelListQuery.includeEmpty,
            customTypesFilter: channelListQuery.customTypesFilter,
            order: channelListQuery.order,
            memberStateFilter: channelListQuery.memberStateFilter,
            limit: channelListQuery.limit
          });
          
          channelListQuery.next((channels, error) => {
            if (error) {
              logError('Error getting channel list:', error);
              reject(error);
            } else {
              // Update cache with all channels
              channels.forEach(channel => {
                channelCacheRef.current[channel.url] = {
                  channel,
                  timestamp: Date.now()
                };
              });
              
              resolve(channels);
            }
          });
        });
      }, 3, 1000, 2);

      // Filter channels based on user role
      const filteredChannels = channels.filter(ch => {
        const channelData = ch.data ? JSON.parse(ch.data) : {};
        // If user is host, show all channels where they are host
        // If user is guest, show only their channels
        return channelData.hostId === currentUserId || channelData.guestId === currentUserId;
      });

      logDebug('Filtered channels:', {
        totalChannels: channels.length,
        filteredChannels: filteredChannels.length,
        userId: currentUserId
      });

      return filteredChannels;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chat list';
      logError(errorMessage, err);
      setError(errorMessage);
      return [];
    }
  };

  // Add a function to refresh channel list without fetching everything from scratch
  const refreshChannelList = async (): Promise<SendBird.GroupChannel[]> => {
    if (!sb) {
      const error = 'Cannot refresh channels: Sendbird not initialized';
      logError(error);
      setError(error);
      return [];
    }
    
    if (!user) {
      const error = 'Cannot refresh channels: User not authenticated';
      logError(error);
      setError(error);
      return [];
    }
    
    if (!isConnected) {
      logDebug('Not connected to Sendbird, connecting first');
      await connectToSendbird();
    }

    try {
      const currentUserId = generateValidUserId(user);
      logDebug('Refreshing channel list for user:', currentUserId);

      const channels = await withRetry(async () => {
        return new Promise<SendBird.GroupChannel[]>((resolve, reject) => {
          const channelListQuery = sb.GroupChannel.createMyGroupChannelListQuery();
          channelListQuery.includeEmpty = true;
          channelListQuery.limit = 100;
          channelListQuery.customTypesFilter = ['food_experience_chat'];
          channelListQuery.order = 'latest_last_message';
          channelListQuery.memberStateFilter = 'all';
          
          logDebug('Channel refresh query params:', {
            includeEmpty: channelListQuery.includeEmpty,
            customTypesFilter: channelListQuery.customTypesFilter,
            order: channelListQuery.order,
            memberStateFilter: channelListQuery.memberStateFilter,
            limit: channelListQuery.limit
          });
          
          channelListQuery.next((channels, error) => {
            if (error) {
              logError('Error refreshing channel list:', error);
              reject(error);
            } else {
              // Update cache with all channels
              channels.forEach(channel => {
                channelCacheRef.current[channel.url] = {
                  channel,
                  timestamp: Date.now()
                };
              });
              
              resolve(channels);
            }
          });
        });
      }, 3, 1000, 2);

      // Filter channels based on user role
      const filteredChannels = channels.filter(ch => {
        const channelData = ch.data ? JSON.parse(ch.data) : {};
        // If user is host, show all channels where they are host
        // If user is guest, show only their channels
        return channelData.hostId === currentUserId || channelData.guestId === currentUserId;
      });

      logDebug('Filtered refreshed channels:', {
        totalChannels: channels.length,
        filteredChannels: filteredChannels.length,
        userId: currentUserId
      });

      return filteredChannels;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh chat list';
      logError(errorMessage, err);
      setError(errorMessage);
      return [];
    }
  };

  return (
    <SendbirdContext.Provider
      value={{
        sb,
        currentChannel,
        messages,
        loading,
        error,
        connectToSendbird,
        disconnectFromSendbird,
        createChannelWithHost,
        findOrCreateChannel,
        sendMessage,
        loadMessages,
        refreshMessages,
        getChannelList,
        refreshChannelList,
      }}
    >
      {children}
    </SendbirdContext.Provider>
  );
}

export function useSendbird() {
  const context = useContext(SendbirdContext);
  if (context === undefined) {
    throw new Error('useSendbird must be used within a SendbirdProvider');
  }
  return context;
}
