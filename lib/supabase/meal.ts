import { supabase } from "./client";

const NUTRIENT_IDS: Record<string, number> = {
  Energy: 1008,
  Protein: 1003,
  "Carbohydrate, by difference": 1005,
  "Total lipid (fat)": 1004,
};

interface Nutrient {
  foodNutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface FoodItem {
  fdcId: string;
  description: string;
  foodCategory: string;
  foodNutrients: Nutrient[];
}

interface NewMealData {
  date: Date;
  hour: string;
  minute: string;
  ampm: string;
  mealType: string;
  meal: FoodItem[];
}

function generateId() {
  return crypto.randomUUID();
}

export async function saveMealToSupabase({ date, hour, minute, ampm, mealType, meal }: NewMealData) {
  const user = await supabase.auth.getUser();
  const user_id = user.data.user?.id;
  if (!user_id) throw new Error("User not logged in");

  const meal_id = generateId();
  const fullDate = new Date(date);
  fullDate.setHours(parseInt(hour) + (ampm === "PM" && hour !== "12" ? 12 : 0));
  fullDate.setMinutes(parseInt(minute));

  // 1. Create meal entry
  const { error: mealErr } = await supabase.from("meal_entry").insert({
    id: meal_id,
    created_at: fullDate.toISOString(),
    user_id,
    meal_type: mealType,
  });
  if (mealErr) throw new Error("Failed to insert meal_entry: " + mealErr.message);

  for (const food of meal) {
    const food_id = food.fdcId;
    const generatedFoodId = crypto.randomUUID();

    // 2. Insert food entry 
    const { error: foodErr } = await supabase.from("food_entry").insert({
        id:generatedFoodId, // generate UUID
        fdc_id: food.fdcId,      // store USDA ID in separate column
        "desc": food.description,
        category: food.foodCategory,
    });
    if (foodErr) throw new Error("Failed to upsert food_entry: " + foodErr.message);

    // 3. Insert into food_meal
    const { error: fmErr } = await supabase.from("food_meal").insert({
      food_id: generatedFoodId,
      meal_id,
    });
    if (fmErr) throw new Error("Failed to insert food_meal: " + fmErr.message);

    // 4. Insert food_nutrients, for each nutrient deconstruct and place in the databse
    const insertedNutrients = await Promise.all(
        food.foodNutrients.map(async (n) => {
          const { data, error } = await supabase
            .from("nutrient_entry")
            .insert({
              name: n.nutrientName,
              unit: n.unitName,
              amount: n.value,
            })
            .select("id") // to retrieve the UUID of the inserted nutrient
            .single();
      
          if (error) throw new Error("Failed to insert nutrient_entry: " + error.message);
      
          return data.id;
        })
      );

      const foodNutrientsToInsert = insertedNutrients.map((nutrient_id) => ({
        food_id: generatedFoodId,
        nutrient_id,
      }));
      
      const { error: fnErr } = await supabase
        .from("food_nutrient")
        .insert(foodNutrientsToInsert);
      
      if (fnErr) throw new Error("Failed to insert food_nutrient: " + fnErr.message);
    }
}