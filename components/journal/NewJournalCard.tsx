'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DatePicker } from "../ui/date-picker";

interface FoodItem {
  fdcId: string;
 // name: string;
  description: string;
  foodCategory: string;
  foodNutrients: Nutrient[];
}
//nutrients for future features! show macros and whatnot
interface Nutrient{
    foodNutrientId: number;
    foodNutrientSourceDescription: string;
    nutrientName : string;
    nutrientNumber: number;
    unitName: string;
    value: number;

}
function TimeSelect({
    hour,
    setHour,
    ampm,
    setAmpm,
  }: {
    hour: string
    setHour: (val: string) => void
    ampm: string
    setAmpm: (val: string) => void
  }) {
    return (
      <div className="flex gap-2 mt-4">
        <Select onValueChange={setHour} value={hour}>
          <SelectTrigger className="w-[80px]">
            <SelectValue placeholder="Hour" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>
                {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        
        <Select onValueChange={setAmpm} value={ampm}>
          <SelectTrigger className="w-[70px]">
            <SelectValue placeholder="AM/PM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )
  }
  
function NewJournalCard() {
  const [query, setQuery] = useState("");
  const [selectedFdcId, setSelectedFdcId] = useState("");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [meal, setMeal] = useState<FoodItem[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [hour, setHour] = useState("")
  const [ampm, setAmpm] = useState("")
  const [mealType, setMealType] = useState("")

  useEffect(() => {
    if (!query) return;

    const fetchFoods = async () => {
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=frDJLeme4MAniWJqR0yFB9DELI5k2IVoD4cJbH0y&query=${encodeURIComponent(
          query
        )}`
      );
      const data = await response.json();
      setFoods(data.foods || []);
      console.log(data);
    };

    fetchFoods();
  }, [query]);
  
  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>New Food Journal Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form>
          {/* Top Row: Meal type + datetime */}
          <div className="flex justify-start">
            <Select name="mealSelect" onValueChange={(value) => setMealType(value)}>
              <SelectTrigger className="w-40%">
                <SelectValue placeholder="Which meal are you logging?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
            <div className="timeDateSelect container">
            <DatePicker date={date} setDate={setDate} />
            <TimeSelect hour={hour} setHour={setHour} ampm={ampm} setAmpm={setAmpm}  />
            </div>
          </div>
  
          {/* Main Row: Search + Meal display side-by-side */}
          <div className="flex justify-between items-start gap-6 mt-10">
            {/* LEFT: Search and select */}
            <div className="flex flex-col">
              <label className="mb-2">Meal:</label>
              <input
                placeholder="search food here"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-4 border p-2 rounded"
              />
              <Select onValueChange={(value) => setSelectedFdcId(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="What did you eat?" />
                </SelectTrigger>
                <SelectContent>
                  {foods.map((food) => (
                    <SelectItem key={food.fdcId} value={String(food.fdcId)}>
                      {food.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="mt-4"
                type="button"
                onClick={() => {
                  const selectedFood = foods.find(
                    (f) => String(f.fdcId) === selectedFdcId
                  );
                  if (
                    selectedFood &&
                    !meal.find((m) => m.fdcId === selectedFood.fdcId)
                  ) {
                    setMeal((prev) => [...prev, selectedFood]);
                  }
                }}
              >
                Add Food to Meal
              </Button>
            </div>
  
            {/* RIGHT: Selected meal items */}
            <div id="mealDisplay" className="border-l border-gray-300 pl-6 w-full ">
              <h3 className="font-bold mb-2">Foods in this meal:</h3>
              <ul className="list-disc pl-5">
                {meal.map((food) => (
                  <li key={food.fdcId}>
                    <p className="font-semibold">{food.description}</p>
                    <ul className="ml-4 text-sm text-gray-700">
                      {food.foodNutrients
                        .filter((n) =>
                          [
                            "Protein",
                            "Total lipid (fat)",
                            "Carbohydrate, by difference",
                            "Energy",
                          ].includes(n.nutrientName)
                        )
                        .map((nutrient) => (
                          <li key={nutrient.foodNutrientId}>
                            {nutrient.nutrientName}: {nutrient.value}{" "}
                            {nutrient.unitName}
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
    <Button className="" onClick={(e) => sessionStorage.SetItem("foodJournal",["meal", {meal}, "date", {date}, "hour", {hour}, "amPm", {ampm}, "meal type", {mealType}])}> Save Meal</Button>
    </>
  );
  
}

export default NewJournalCard;
