import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send, X, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useSendbird } from '@/contexts/SendbirdContext';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

// Add debug logging utility
const logDebug = (message: string, ...args: any[]) => {
  console.log(`[ChatDialog Debug] ${message}`, ...args);
};

// Improved debounce utility with proper typing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

// Exponential backoff utility for retries
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

// Global initialization state to prevent multiple initializations
// This is a Map of hostId -> initialization state
const globalInitState = new Map<string, {
  isInitializing: boolean;
  isInitialized: boolean;
  lastInitAttempt: number;
  instanceId: string | null;
}>();

// Global message input state to preserve across refreshes
// This is a Map of hostId -> message text
const globalMessageState = new Map<string, string>();

// Initialization state machine
type InitState = 
  | 'idle'           // Not initialized yet
  | 'connecting'     // Connecting to Sendbird
  | 'finding_channel' // Finding or creating channel
  | 'loading_messages' // Loading messages
  | 'initialized'    // Fully initialized
  | 'error';         // Error state

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostId: string;
  hostName: string;
  hostImage?: string;
  experienceId: number;
}

function ChatDialogComponent({ 
  open, 
  onOpenChange, 
  hostId, 
  hostName, 
  hostImage, 
  experienceId 
}: ChatDialogProps) {
  const { user } = useAuth();
  const { 
    connectToSendbird, 
    findOrCreateChannel, 
    currentChannel, 
    messages, 
    sendMessage, 
    loadMessages,
    refreshMessages,
    loading: sendbirdLoading,
    error: sendbirdError
  } = useSendbird();
  
  // Local state
  const [messageText, setMessageText] = useState(() => globalMessageState.get(hostId) || '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [initState, setInitState] = useState<InitState>(() => {
    // Check if we already have a global state for this hostId
    const globalState = globalInitState.get(hostId);
    if (globalState?.isInitialized) {
      return 'initialized';
    }
    return 'idle';
  });
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Refs for stable values
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializationRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const hostIdRef = useRef(hostId);
  const openRef = useRef(open);
  const messagesRef = useRef(messages);
  const initAttemptCountRef = useRef(0);
  const messageTextRef = useRef(messageText);
  const hasInitializedRef = useRef(false);
  const currentChannelUrlRef = useRef<string | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Update refs when props/state change
  useEffect(() => {
    hostIdRef.current = hostId;
    openRef.current = open;
    messagesRef.current = messages;
    messageTextRef.current = messageText;
    
    // Save message text to global state
    if (messageText) {
      globalMessageState.set(hostId, messageText);
    } else {
      globalMessageState.delete(hostId);
    }
  }, [hostId, open, messages, messageText]);
  
  // Update currentChannelUrlRef when currentChannel changes
  useEffect(() => {
    if (currentChannel) {
      currentChannelUrlRef.current = currentChannel.url;
    }
  }, [currentChannel]);
  
  // Derived state
  const isConnecting = initState === 'connecting' || initState === 'finding_channel' || initState === 'loading_messages';
  const isInitialized = initState === 'initialized';
  const error = sendbirdError || localError;
  const isLoading = isConnecting || sendbirdLoading;
  
  // Stable identity for the component instance
  const instanceId = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  
  // Log component props and state on render, but only in development
  if (process.env.NODE_ENV === 'development') {
    logDebug(`[${instanceId}] Rendering ChatDialog`, { 
      open, 
      hostId, 
      hostName, 
      initState,
      error,
      currentChannel: currentChannel?.url,
      messagesCount: messages.length,
      globalState: globalInitState.get(hostId),
      messageText: messageText.length > 0 ? `${messageText.substring(0, 10)}...` : '',
      hasInitialized: hasInitializedRef.current
    });
  }
  
  // Set up cleanup on unmount
  useEffect(() => {
    logDebug(`[${instanceId}] Component mounted`);
    
    // Register this instance in the global state
    const globalState = globalInitState.get(hostId) || {
      isInitializing: false,
      isInitialized: false,
      lastInitAttempt: 0,
      instanceId: null
    };
    
    // Only update the instanceId if we're not already initializing/initialized
    if (!globalState.isInitializing && !globalState.isInitialized) {
      globalState.instanceId = instanceId;
      globalInitState.set(hostId, globalState);
    }
    
    return () => {
      logDebug(`[${instanceId}] Component unmounting`);
      mountedRef.current = false;
      
      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      // Abort any in-progress initialization
      if (initializationRef.current) {
        initializationRef.current.abort();
        initializationRef.current = null;
      }
      
      // Only clear the global state if this instance is the one that set it
      const currentGlobalState = globalInitState.get(hostId);
      if (currentGlobalState && currentGlobalState.instanceId === instanceId) {
        // Don't remove from the map, just update the instanceId
        currentGlobalState.instanceId = null;
        
        // If we're not initialized, also reset the initializing flag
        if (!currentGlobalState.isInitialized) {
          currentGlobalState.isInitializing = false;
        }
      }
    };
  }, [instanceId, hostId]);
  
  // Reset state when dialog is closed
  useEffect(() => {
    if (!open) {
      logDebug(`[${instanceId}] Dialog closed, resetting state`);
      
      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      // Don't reset everything immediately to avoid flickering if dialog is reopening
      const timeout = setTimeout(() => {
        if (!open && mountedRef.current) {
          // Only reset local state, not global state
          setLocalError(null);
          
          // Abort any in-progress initialization
          if (initializationRef.current) {
            initializationRef.current.abort();
            initializationRef.current = null;
          }
        }
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [open, instanceId]);
  
  // Reset state when hostId changes
  useEffect(() => {
    logDebug(`[${instanceId}] Host ID changed, resetting state`, { 
      previousHostId: hostIdRef.current, 
      newHostId: hostId 
    });
    
    if (hostIdRef.current !== hostId) {
      // Reset initialization flag when host changes
      hasInitializedRef.current = false;
      
      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      // Check if we already have a global state for this hostId
      const globalState = globalInitState.get(hostId);
      if (globalState?.isInitialized) {
        setInitState('initialized');
      } else {
        setInitState('idle');
      }
      
      // Load saved message text for this host
      setMessageText(globalMessageState.get(hostId) || '');
      
      setLocalError(null);
      
      // Abort any in-progress initialization
      if (initializationRef.current) {
        initializationRef.current.abort();
        initializationRef.current = null;
      }
      
      // Clear current channel URL to force reloading messages
      currentChannelUrlRef.current = null;
      
      // Force a new initialization to load the correct messages
      // This will ensure we get the messages for the new host
      if (open && user) {
        // Small delay to ensure state updates have propagated
        setTimeout(() => {
          if (mountedRef.current && openRef.current) {
            logDebug(`[${instanceId}] Forcing initialization for new host`);
            initializeChat();
          }
        }, 50);
      }
    }
  }, [hostId, instanceId, open, user]);
  
  // Initialize chat when dialog opens
  const initializeChat = useCallback(async () => {
    // Skip if already initialized in this session
    if (hasInitializedRef.current) {
      logDebug(`[${instanceId}] Already initialized in this session, skipping`);
      return;
    }
    
    // Skip initialization if not open, no user, or component unmounted
    if (!open || !user || !mountedRef.current) {
      logDebug(`[${instanceId}] Skipping initialization`, { 
        open, 
        user: !!user, 
        mounted: mountedRef.current 
      });
      return;
    }
    
    // Check global state first
    let globalState = globalInitState.get(hostId);
    if (!globalState) {
      globalState = {
        isInitializing: false,
        isInitialized: false,
        lastInitAttempt: 0,
        instanceId: null
      };
      globalInitState.set(hostId, globalState);
    }
    
    // If already initialized globally, just update local state
    if (globalState.isInitialized) {
      logDebug(`[${instanceId}] Already initialized globally, updating local state`);
      setInitState('initialized');
      hasInitializedRef.current = true;
      return;
    }
    
    // If another instance is initializing, skip
    if (globalState.isInitializing && globalState.instanceId !== instanceId) {
      logDebug(`[${instanceId}] Another instance is initializing, skipping`, {
        initializingInstance: globalState.instanceId
      });
      return;
    }
    
    // Skip initialization if already in progress
    if (initState !== 'idle') {
      logDebug(`[${instanceId}] Initialization already in progress, skipping`, { 
        initState
      });
      return;
    }
    
    // Prevent too frequent initialization attempts
    const now = Date.now();
    if (now - globalState.lastInitAttempt < 2000) {
      logDebug(`[${instanceId}] Throttling initialization attempts`, {
        timeSinceLastAttempt: now - globalState.lastInitAttempt
      });
      return;
    }
    
    // Mark as initializing in global state
    globalState.isInitializing = true;
    globalState.instanceId = instanceId;
    globalState.lastInitAttempt = now;
    
    // Increment attempt counter
    initAttemptCountRef.current += 1;
    const currentAttempt = initAttemptCountRef.current;
    
    // Create a new AbortController for this initialization attempt
    const abortController = new AbortController();
    initializationRef.current = abortController;
    
    const startTime = Date.now();
    logDebug(`[${instanceId}] Starting chat initialization`, { 
      hostId, 
      hostName, 
      attempt: currentAttempt 
    });
    
    // Step 1: Connect to Sendbird
    try {
      setInitState('connecting');
      setLocalError(null);
      
      logDebug(`[${instanceId}] Connecting to Sendbird...`);
      await withRetry(() => connectToSendbird(), 3, 1000, 2);
      
      if (abortController.signal.aborted) {
        logDebug(`[${instanceId}] Initialization aborted after connecting to Sendbird`);
        globalState.isInitializing = false;
        return;
      }
      
      // Check if component is still mounted and dialog is open
      if (!mountedRef.current || !openRef.current) {
        logDebug(`[${instanceId}] Component unmounted or dialog closed during initialization`);
        globalState.isInitializing = false;
        return;
      }
      
      logDebug(`[${instanceId}] Connected to Sendbird`, { elapsed: Date.now() - startTime });
      
      // Step 2: Find or create channel
      setInitState('finding_channel');
      
      const channelName = `Chat with ${hostName}`;
      logDebug(`[${instanceId}] Finding or creating channel`, { hostId, channelName });
      
      const channel = await withRetry(() => findOrCreateChannel(hostId, channelName), 3, 1000, 2);
      
      if (abortController.signal.aborted) {
        logDebug(`[${instanceId}] Initialization aborted after finding/creating channel`);
        globalState.isInitializing = false;
        return;
      }
      
      // Check if component is still mounted and dialog is open
      if (!mountedRef.current || !openRef.current) {
        logDebug(`[${instanceId}] Component unmounted or dialog closed during initialization`);
        globalState.isInitializing = false;
        return;
      }
      
      logDebug(`[${instanceId}] Channel found/created`, { 
        channelUrl: channel.url, 
        channelName: channel.name,
        memberCount: channel.memberCount,
        elapsed: Date.now() - startTime 
      });
      
      // Save channel URL for refresh
      currentChannelUrlRef.current = channel.url;
      
      // Step 3: Load messages
      setInitState('loading_messages');
      
      logDebug(`[${instanceId}] Loading messages for channel`, { channelUrl: channel.url });
      await withRetry(() => loadMessages(channel.url), 3, 1000, 2);
      
      if (abortController.signal.aborted) {
        logDebug(`[${instanceId}] Initialization aborted after loading messages`);
        globalState.isInitializing = false;
        return;
      }
      
      // Check if component is still mounted and dialog is open
      if (!mountedRef.current || !openRef.current) {
        logDebug(`[${instanceId}] Component unmounted or dialog closed during initialization`);
        globalState.isInitializing = false;
        return;
      }
      
      logDebug(`[${instanceId}] Messages loaded successfully`, { 
        messagesCount: messagesRef.current.length,
        elapsed: Date.now() - startTime 
      });
      
      // Mark as initialized in both local and global state
      setInitState('initialized');
      globalState.isInitialized = true;
      globalState.isInitializing = false;
      hasInitializedRef.current = true;
      
      // Set up periodic refresh for new messages
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      refreshIntervalRef.current = setInterval(() => {
        if (mountedRef.current && openRef.current && currentChannelUrlRef.current) {
          refreshMessages(currentChannelUrlRef.current).catch(err => {
            logDebug(`[${instanceId}] Error refreshing messages:`, err);
          });
        }
      }, 10000); // Refresh every 10 seconds
      
      logDebug(`[${instanceId}] Chat initialization completed successfully`, {
        elapsed: Date.now() - startTime,
        globalState,
        hasInitialized: hasInitializedRef.current
      });
      
    } catch (error) {
      if (abortController.signal.aborted) {
        logDebug(`[${instanceId}] Error occurred but initialization was already aborted`);
        globalState.isInitializing = false;
        return;
      }
      
      // Check if component is still mounted and dialog is open
      if (!mountedRef.current || !openRef.current) {
        logDebug(`[${instanceId}] Component unmounted or dialog closed during initialization error`);
        globalState.isInitializing = false;
        return;
      }
      
      logDebug(`[${instanceId}] Failed to initialize chat`, { error, elapsed: Date.now() - startTime });
      console.error('Failed to initialize chat:', error);
      
      // Handle rate limit errors specially
      if (error instanceof Error && error.message.includes('Too many requests')) {
        setLocalError('Rate limit exceeded. Please try again in a moment.');
      } else {
        setLocalError(error instanceof Error ? error.message : 'Failed to initialize chat');
      }
      
      setInitState('error');
      globalState.isInitializing = false;
    }
  }, [user, open, initState, hostId, hostName, instanceId, connectToSendbird, findOrCreateChannel, loadMessages, refreshMessages]);
  
  // Start initialization when dialog opens
  useEffect(() => {
    if (open && user && initState === 'idle' && !hasInitializedRef.current) {
      // Check if already initialized globally
      const globalState = globalInitState.get(hostId);
      if (globalState?.isInitialized) {
        logDebug(`[${instanceId}] Already initialized globally, updating local state`);
        setInitState('initialized');
        hasInitializedRef.current = true;
        
        // Set up refresh interval for new messages
        if (currentChannelUrlRef.current && !refreshIntervalRef.current) {
          // Immediately refresh messages when opening an already initialized chat
          if (open && currentChannelUrlRef.current) {
            logDebug(`[${instanceId}] Dialog opened with existing channel, refreshing messages`);
            refreshMessages(currentChannelUrlRef.current)
              .then(() => {
                // Scroll to bottom after refreshing
                setTimeout(() => {
                  if (messagesEndRef.current && open && mountedRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
                  }
                }, 100);
              })
              .catch(err => {
                logDebug(`[${instanceId}] Error refreshing messages on open:`, err);
              });
          }
          
          refreshIntervalRef.current = setInterval(() => {
            if (mountedRef.current && openRef.current && currentChannelUrlRef.current) {
              refreshMessages(currentChannelUrlRef.current).catch(err => {
                logDebug(`[${instanceId}] Error refreshing messages:`, err);
              });
            }
          }, 10000); // Refresh every 10 seconds
        } else if (!currentChannelUrlRef.current) {
          // If we don't have a channel URL but we're supposed to be initialized,
          // force a new initialization to get the correct messages
          logDebug(`[${instanceId}] No channel URL but initialized state, reinitializing`);
          hasInitializedRef.current = false;
          initializeChat();
        }
        
        return;
      }
      
      logDebug(`[${instanceId}] Dialog opened, starting initialization`);
      
      // Abort any previous initialization
      if (initializationRef.current) {
        initializationRef.current.abort();
        initializationRef.current = null;
      }
      
      // Start initialization with a small delay to avoid race conditions
      const timer = setTimeout(() => {
        if (mountedRef.current && openRef.current && initState === 'idle' && !hasInitializedRef.current) {
          initializeChat();
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [open, user, initState, hostId, refreshMessages, instanceId, initializeChat]);
  
  // Handle manual refresh of messages
  const handleRefreshMessages = useCallback(async () => {
    if (!currentChannel || !connectToSendbird) return;
    
    setLocalError(null);
    setInitState('loading_messages');
    setLoading(true);
    
    try {
      console.debug("[ChatDialog] Manually refreshing messages");
      await withRetry(() => refreshMessages(currentChannel.url), 3, 1000, 2);
      
      // Ensure we scroll to the bottom after refresh
      setTimeout(() => {
        if (messagesEndRef.current && openRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 100);
      
      // Set back to initialized state after successful refresh
      setInitState('initialized');
    } catch (error) {
      console.error("[ChatDialog] Error refreshing messages:", error);
      setLocalError(error instanceof Error ? error.message : 'Failed to refresh messages');
      setInitState('error');
    } finally {
      setLoading(false);
    }
  }, [currentChannel, connectToSendbird, refreshMessages, messagesEndRef, openRef, setLocalError, setInitState, setLoading]);
  
  // Set up periodic refresh for new messages
  useEffect(() => {
    if (isInitialized && open) {
      logDebug(`[${instanceId}] Setting up message refresh interval`);
      
      // Clear any existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      // Only set up refresh if we have a channel URL
      if (currentChannelUrlRef.current) {
        // Immediately refresh messages when the component becomes initialized
        refreshMessages(currentChannelUrlRef.current)
          .then(() => {
            // Scroll to bottom after refreshing
            setTimeout(() => {
              if (messagesEndRef.current && open && mountedRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
              }
            }, 100);
          })
          .catch(err => {
            logDebug(`[${instanceId}] Error refreshing messages on initialization:`, err);
          });
        
        // Set up new interval
        refreshIntervalRef.current = setInterval(async () => {
          if (mountedRef.current && openRef.current && currentChannelUrlRef.current) {
            logDebug(`[${instanceId}] Auto-refreshing messages`);
            try {
              await refreshMessages(currentChannelUrlRef.current);
              
              // Ensure we scroll to the bottom after refresh
              setTimeout(() => {
                if (messagesEndRef.current && open && mountedRef.current) {
                  messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
                }
              }, 100);
            } catch (err) {
              logDebug(`[${instanceId}] Error refreshing messages:`, err);
            }
          }
        }, 10000); // Refresh every 10 seconds
      }
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [isInitialized, open, instanceId, refreshMessages]);
  
  // Scroll to bottom when messages change or when the dialog opens
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logDebug(`[${instanceId}] Messages changed or dialog opened`, { 
        messagesCount: messages.length,
        open
      });
    }
    
    // Use a small delay to ensure the DOM has updated
    const timer = setTimeout(() => {
      if (messagesEndRef.current && open) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages, open, instanceId]);
  
  // Sort messages by creation time to ensure chronological order
  const sortedMessages = useMemo(() => {
    // Create a map to detect duplicate messageIds
    const messageMap = new Map();
    const uniqueMessages = [];
    
    // Sort messages and ensure uniqueness
    const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt);
    
    // Process messages to ensure uniqueness
    sorted.forEach(message => {
      // If we've already seen this messageId, skip it
      if (messageMap.has(message.messageId)) {
        logDebug(`[${instanceId}] Duplicate message detected:`, message.messageId);
        return;
      }
      
      // Add to our map and unique messages array
      messageMap.set(message.messageId, true);
      uniqueMessages.push(message);
    });
    
    return uniqueMessages;
  }, [messages, instanceId]);
  
  // Track typing users
  useEffect(() => {
    if (!currentChannel || !isInitialized) return;
    
    const typingMembers = currentChannel.getTypingMembers();
    if (typingMembers.length > 0) {
      logDebug(`[${instanceId}] Typing users:`, typingMembers.map(m => m.nickname));
      
      // Filter out the current user
      const otherTypingUsers = typingMembers
        .filter(member => member.userId !== (user?.sub || user?.email))
        .map(member => member.nickname || member.userId);
      
      setTypingUsers(otherTypingUsers);
    } else {
      setTypingUsers([]);
    }
  }, [currentChannel, isInitialized, user, instanceId]);
  
  // Send typing status when user is typing
  const debouncedTypingEnd = useCallback(
    debounce(() => {
      if (currentChannel && isInitialized) {
        logDebug(`[${instanceId}] Sending typing end status`);
        currentChannel.endTyping();
      }
    }, 2000),
    [currentChannel, isInitialized, instanceId]
  );
  
  const handleTyping = useCallback(() => {
    if (currentChannel && isInitialized) {
      logDebug(`[${instanceId}] Sending typing status`);
      currentChannel.startTyping();
      debouncedTypingEnd();
    }
  }, [currentChannel, isInitialized, debouncedTypingEnd, instanceId]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    logDebug(`[${instanceId}] Sending message`, { text: messageText });
    const textToSend = messageText;
    setMessageText(''); // Clear input immediately for better UX
    globalMessageState.delete(hostId); // Clear from global state
    
    try {
      const result = await withRetry(() => sendMessage(textToSend), 3, 1000, 2);
      logDebug(`[${instanceId}] Message sent`, { result });
      
      // Scroll to bottom after sending a message
      setTimeout(() => {
        if (messagesEndRef.current && open && mountedRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 100);
    } catch (error) {
      logDebug(`[${instanceId}] Failed to send message`, { error });
      console.error('Failed to send message:', error);
      // Optionally show an error toast or notification here
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setMessageText(newText);
    
    // Send typing indicator if text is being added
    if (newText.length > 0) {
      handleTyping();
    }
  };
  
  const handleRetry = () => {
    logDebug(`[${instanceId}] Retry button clicked`);
    setLocalError(null);
    setInitState('idle');
    hasInitializedRef.current = false;
    
    // Reset global state
    const globalState = globalInitState.get(hostId);
    if (globalState) {
      globalState.isInitialized = false;
      globalState.isInitializing = false;
      globalState.instanceId = instanceId;
    }
    
    // Abort any in-progress initialization
    if (initializationRef.current) {
      initializationRef.current.abort();
      initializationRef.current = null;
    }
    
    // Force a new initialization attempt
    initAttemptCountRef.current += 1;
    initializeChat();
  };
  
  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (process.env.NODE_ENV === 'development') {
          logDebug(`[${instanceId}] Dialog onOpenChange called`, { currentOpen: open, newOpen });
        }
        onOpenChange(newOpen);
      }}
    >
      <div 
        className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        style={{ display: open ? 'block' : 'none' }}
        onClick={() => onOpenChange(false)}
      />
      <div
        className="fixed z-50 flex flex-col p-0 sm:max-w-[400px] h-[100vh] bg-background"
        style={{ 
          right: '0',
          top: '0',
          bottom: '0',
          margin: '0',
          borderRadius: '8px 0 0 8px', // Round only the left corners
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
          display: open ? 'flex' : 'none'
        }}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={hostImage} alt={hostName} />
                <AvatarFallback>{hostName.charAt(0)}</AvatarFallback>
              </Avatar>
              <DialogTitle>Chat with {hostName}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {isInitialized && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRefreshMessages}
                  className="h-8 w-8"
                  title="Refresh messages"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Refresh</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
              <p className="text-muted-foreground">
                {initState === 'connecting' && 'Connecting to chat service...'}
                {initState === 'finding_channel' && 'Setting up chat channel...'}
                {initState === 'loading_messages' && 'Loading conversation...'}
                {initState === 'idle' && sendbirdLoading && 'Loading...'}
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-red-500 mb-2">{error}</p>
              <Button onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4 overflow-y-auto">
              <div className="flex flex-col space-y-4">
                {sortedMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  sortedMessages.map((message) => {
                    const isCurrentUser = message.sender.userId === (user?.sub || user?.email);
                    // Create a truly unique key by combining messageId with createdAt
                    const uniqueKey = `${message.messageId}-${message.createdAt}`;
                    
                    return (
                      <div 
                        key={uniqueKey} 
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                          {!isCurrentUser && (
                            <div className="flex items-center gap-2 mb-1">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={message.sender.profileUrl} />
                                <AvatarFallback>{message.sender.nickname?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{message.sender.nickname}</span>
                            </div>
                          )}
                          <div 
                            className={`rounded-lg p-3 ${
                              isCurrentUser 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.message}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t">
              <div className="flex flex-col gap-2">
                {typingUsers.length > 0 && (
                  <div className="text-xs text-muted-foreground animate-pulse">
                    {typingUsers.length === 1 
                      ? `${typingUsers[0]} is typing...` 
                      : `${typingUsers.join(', ')} are typing...`}
                  </div>
                )}
              <div className="flex gap-2">
                <Textarea
                  value={messageText}
                    onChange={handleMessageChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="min-h-[60px] resize-none"
                />
                <Button 
                  onClick={handleSendMessage} 
                  size="icon" 
                  disabled={!messageText.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ChatDialog = memo(ChatDialogComponent);
