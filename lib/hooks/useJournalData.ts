import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface JournalData {
  date: string;
  cals: number;
  prots: number;
  carbs: number;
}

export function useJournalData() {
    const [data, setData] = useState<JournalData[]>([]);
    const [loading, setLoading] = useState(true); // new
    const [error, setError] = useState<string | null>(null); // optional
  
    useEffect(() => {
      const fetchData = async () => {
        const { data: userData, error: authError } = await supabase.auth.getUser();
  
        if (authError || !userData?.user) {
          setError("User not logged in");
          setLoading(false);
          return;
        }
  
        const userId = userData.user.id;
  
        const { data: meals, error: mealError } = await supabase
          .from("meal_entry")
          .select(`
            id,
            created_at,
            food_meal (
              food_entry (
                food_nutrient (
                  nutrient_entry (
                    id,
                    name,
                    amount
                  )
                )
              )
            )
          `)
          .eq("user_id", userId);
  
        if (mealError || !meals) {
          setError(mealError?.message || "Unknown error");
          setLoading(false);
          return;
        }
  
        const transformed: JournalData[] = meals.map((meal: any) => {
          const date = new Date(meal.created_at).toISOString().split("T")[0];
          let cals = 0,
            prots = 0,
            carbs = 0;
  
          meal.food_meal?.forEach((fm: any) => {
            fm.food_entry?.food_nutrient?.forEach((fn: any) => {
              const nutrient = fn.nutrient_entry;
              if (!nutrient) return;
  
              if (nutrient.name === "Energy") cals += nutrient.amount;
              if (nutrient.name === "Protein") prots += nutrient.amount;
              if (nutrient.name === "Carbohydrate, by difference") carbs += nutrient.amount;
            });
          });
  
          return { date, cals, prots, carbs };
        });
  
        setData(transformed);
        setLoading(false);
      };
  
      fetchData();
    }, []);
  
    return { data, loading, error };
  }
  