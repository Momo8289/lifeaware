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
): ()=> void {
  // Generate a unique channel name with timestamp to prevent conflicts
  const channelName = `${table}-${userId}-${Date.now()}`;
  let channel: RealtimeChannel | null=null;
  let retryCount = 0;
  let retryTimeout: NodeJS.Timeout | null=null;
  const MAX_RETRIES = 5;
  //variable to track if cleaned-up
  let isCleanedUp = false;
  
  // Function to create and initialize the channel
  const setupChannel = () => {
    //checked if cleaned-up to not create unnecessary poll requests
    if (isCleanedUp){
      
      return}
      // Clean up any existing channel first
      if (channel) {
        
        try {
          supabase.removeChannel(channel);
        } catch (e) {
      
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
        
        channel = channel!.on('postgres_changes', options, payload => {
       
          onChangeCallback();
        });
      });
      
      // Add reconnection handler
      channel.on('system', { event: 'reconnect' }, () => {
        // When system reconnects, refresh data
      
        onChangeCallback();
      });
      
      // Subscribe with error handling
      channel.subscribe(status => {
   

        if (isCleanedUp) return;

        if (status === 'SUBSCRIBED') {
          // Reset retry count on successful subscription
          retryCount = 0;
          if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          // Attempt to reconnect with exponential backoff
          if (retryCount < MAX_RETRIES) {
            const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 30000);
            retryCount++;
          
            retryTimeout = setTimeout(() => {
              setupChannel();
            }, backoffTime);
          }else{
          //  console.error(`[Realtime] Max retries reached — giving up`)
          }
        }
      });
    } 
  };
  
  // Initial setup
  setupChannel();
  
  // Return cleanup function
  return () => {
    isCleanedUp = true
   

    if (retryTimeout) {
      clearTimeout(retryTimeout)
      retryTimeout = null
    }

    if (channel) {
      try {
       
        supabase.removeChannel(channel)
        channel = null
      } catch (e) {
       // console.warn(`[Realtime] Failed to remove channel during cleanup:`, e)
      }
    }
  }
}