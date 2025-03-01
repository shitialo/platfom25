import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { useSendbird } from '@/contexts/SendbirdContext';
import { ChatDialog } from './ChatDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import * as SendbirdType from 'sendbird';
import { useAuth } from '@/contexts/AuthContext';

// Add debug logging utility
const logDebug = (message: string, ...args: any[]) => {
  console.log(`[HostChatList Debug] ${message}`, ...args);
};

interface ChatUser {
  id: string;
  name: string;
  image?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  channelUrl: string; // Add channelUrl to track channels
}

export function HostChatList() {
  const { user } = useAuth();
  const { 
    connectToSendbird, 
    getChannelList,
    refreshChannelList,
    loadMessages,
    loading,
    error,
    sb
  } = useSendbird();
  
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chatDialogKey, setChatDialogKey] = useState<string>('initial');
  
  // Refs for stable values
  const mountedRef = useRef(true);
  const chatUsersRef = useRef<ChatUser[]>([]);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialLoadCompletedRef = useRef(false);
  
  // Update refs when state changes
  useEffect(() => {
    chatUsersRef.current = chatUsers;
  }, [chatUsers]);
  
  // Set up cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);
  
  // Transform channels to chat users
  const transformChannelsToUsers = useCallback((channels: SendbirdType.GroupChannel[]): ChatUser[] => {
    return channels.map(channel => {
      // Get channel data
      const channelData = channel.data ? JSON.parse(channel.data) : {};
      
      // Find the guest user (non-host user) in the channel
      const guestUser = channel.members.find(member => {
        const sbMember = member as SendbirdType.Member;
        return sbMember.userId === channelData.guestId;
      });

      const lastMessage = channel.lastMessage as SendbirdType.UserMessage;

      return {
        id: guestUser?.userId || 'unknown',
        name: guestUser?.nickname || 'Unknown User',
        image: guestUser?.profileUrl,
        lastMessage: lastMessage?.message || '',
        lastMessageTime: lastMessage ? new Date(lastMessage.createdAt) : undefined,
        unreadCount: channel.unreadMessageCount,
        channelUrl: channel.url // Store channel URL for tracking
      };
    });
  }, []);
  
  // Initial load of chat list
  const loadInitialChatList = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setIsLoading(true);
    try {
      logDebug('Connecting to Sendbird for initial host chat list...');
      await connectToSendbird();
      logDebug('Getting channel list...');
      const channels = await getChannelList();
      logDebug('Received channels:', channels.length);
      
      // Transform channels to chat users
      const users = transformChannelsToUsers(channels);
      
      // Sort by last message time (most recent first)
      users.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });
      
      logDebug('Initial chat users loaded:', users.length);
      
      if (mountedRef.current) {
        setChatUsers(users);
        initialLoadCompletedRef.current = true;
      }
    } catch (error) {
      console.error('Failed to load initial chat list:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [connectToSendbird, getChannelList, transformChannelsToUsers]);
  
  // Refresh chat list incrementally
  const refreshChatList = useCallback(async () => {
    if (!mountedRef.current || !initialLoadCompletedRef.current) return;
    
    setIsRefreshing(true);
    try {
      logDebug('Refreshing channel list...');
      const channels = await refreshChannelList();
      logDebug('Received refreshed channels:', channels.length);
      
      // Transform channels to chat users
      const newUsers = transformChannelsToUsers(channels);
      
      // Update existing users or add new ones
      setChatUsers(prevUsers => {
        // Create a map of existing users by channelUrl for quick lookup
        const existingUserMap = new Map<string, ChatUser>();
        prevUsers.forEach(user => {
          if (user.channelUrl) {
            existingUserMap.set(user.channelUrl, user);
          }
        });
        
        // Process new users
        const updatedUsers = newUsers.map(newUser => {
          const existingUser = existingUserMap.get(newUser.channelUrl);
          
          // If this is a new channel or has a newer message, use the new data
          if (!existingUser || 
              (newUser.lastMessageTime && existingUser.lastMessageTime && 
               newUser.lastMessageTime.getTime() > existingUser.lastMessageTime.getTime())) {
            
            // If this is the selected user and has a new message, update the chat dialog key
            if (selectedUser && newUser.channelUrl === selectedUser.channelUrl && 
                newUser.lastMessageTime && 
                (!selectedUser.lastMessageTime || 
                 newUser.lastMessageTime.getTime() > selectedUser.lastMessageTime.getTime())) {
              logDebug('Selected user has new message, updating chat dialog key');
              setChatDialogKey(`${newUser.channelUrl}-${newUser.lastMessageTime.getTime()}`);
              
              // Also update the selected user to reflect the changes
              setSelectedUser(newUser);
            }
            
            return newUser;
          }
          
          // Otherwise keep the existing user data
          return existingUser;
        });
        
        // Sort by last message time (most recent first)
        updatedUsers.sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        });
        
        logDebug('Updated chat users:', updatedUsers.length);
        return updatedUsers;
      });
    } catch (error) {
      console.error('Failed to refresh chat list:', error);
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [refreshChannelList, transformChannelsToUsers]);
  
  // Handle manual refresh
  const handleManualRefresh = useCallback(() => {
    logDebug('Manual refresh triggered');
    refreshChatList();
  }, [refreshChatList]);
  
  // Load chat list when component mounts and set up refresh interval
  useEffect(() => {
    // Initial load
    loadInitialChatList();
    
    // Set up periodic refresh (every 15 seconds)
    refreshIntervalRef.current = setInterval(() => {
      if (mountedRef.current && initialLoadCompletedRef.current) {
        logDebug('Auto-refreshing chat list');
        refreshChatList();
      }
    }, 15000); // Refresh every 15 seconds
    
    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [loadInitialChatList, refreshChatList, user]); 
  
  const handleUserSelect = (user: ChatUser) => {
    setSelectedUser(user);
    setIsChatOpen(true);
    // Set a new chat dialog key when selecting a user
    setChatDialogKey(`${user.channelUrl}-${Date.now()}`);
  };
  
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <Button onClick={() => connectToSendbird()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Your Conversations</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleManualRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {chatUsers.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
          <p className="text-muted-foreground mb-4">
            When guests message you about your food experiences, they'll appear here.
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {chatUsers.map((user) => (
              <Card 
                key={user.channelUrl} 
                className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                  user.unreadCount > 0 ? 'border-primary' : ''
                }`}
                onClick={() => handleUserSelect(user)}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">{user.name}</h3>
                      {user.lastMessageTime && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(user.lastMessageTime, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  {user.unreadCount > 0 && (
                    <div className="bg-primary text-primary-foreground rounded-full h-6 min-w-6 flex items-center justify-center text-xs font-medium px-1.5">
                      {user.unreadCount}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
      
      {selectedUser && (
        <ChatDialog
          key={chatDialogKey}
          open={isChatOpen}
          onOpenChange={setIsChatOpen}
          hostId={selectedUser.id}
          hostName={selectedUser.name}
          hostImage={selectedUser.image}
          experienceId={0} // This is not relevant for the host view
        />
      )}
    </div>
  );
}
