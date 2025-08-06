import { supabase } from "./client";

function generateId() {
    return crypto.randomUUID();
  }

  interface Water {
    amount: number;
    user_id: string;
  }

  export async function saveWaterToSupabase(amount: number) {
    const id = generateId();
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) throw new Error("User not authenticated");
  
    const { data, error } = await supabase
      .from("water_entry")
      .insert([{ 
        amount, 
        user_id: user.id ,
        id
        }]);
  
    if (error) {
      console.error("Failed to save water data:", error.message);
      throw error;
    }
  
    return data;
  }