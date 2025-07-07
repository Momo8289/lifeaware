import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a robust Supabase Realtime channel subscription with retry capabilities
 * 
 * @param supabase - The Supabase client instance
 * @param userId - Current user ID to create a unique channel name
 * @param table - Database table to subscribe to
 * @param onChangeCallback - Function to execute when changes occur
 * @param filter - Optional filter condition (e.g., 'status=eq.active')
 * @returns A cleanup function to remove the channel
 */
export function createRobustSubscription(
  supabase: SupabaseClient,
  userId: string,
  table: string,
  onChangeCallback: () => void,
  filter?: string
) {
  // TODO: Implement proper cleanup function to return
  // Generate a unique channel name with timestamp to prevent conflicts
  const channelName = `${table}-${userId}-${Date.now()}`;
  let channel: RealtimeChannel | undefined;
  let retryCount = 0;
  let retryTimeout: NodeJS.Timeout | undefined;
  const MAX_RETRIES = 5;
  
  // Function to create and initialize the channel
  const setupChannel = () => {
    try {
      // Clean up any existing channel first
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          console.error('Error removing existing channel:', e);
        }
      }
      
      // Create a new channel
      channel = supabase.channel(channelName);
      
      // Add event handlers for all CRUD operations
      ['INSERT', 'UPDATE', 'DELETE'].forEach(event => {
        const options: any = { 
          event, 
          schema: 'public', 
          table,
        };
        
        // Add filter if provided
        if (filter) {
          options.filter = filter;
        }
        
        channel = channel?.on('postgres_changes', options, () => {
          onChangeCallback();
        });
      });
      
      // Add reconnection handler
      channel?.on('system', { event: 'reconnect' }, () => {
        // When system reconnects, refresh data
        onChangeCallback();
      });
      
      // Subscribe with error handling
      channel?.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          // Reset retry count on successful subscription
          retryCount = 0;
          if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = undefined;
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          // Attempt to reconnect with exponential backoff
          if (retryCount < MAX_RETRIES) {
            const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 30000);
            retryCount++;
            
            retryTimeout = setTimeout(() => {
              setupChannel();
            }, backoffTime);
          }
        }
      });
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
      throw error;
    }
  };
  
  // Initial setup
  setupChannel();
  
  // Return cleanup function
  return () => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
    
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.error('Error removing channel during cleanup:', e);
      }
    }
  };
}