"use client";

import {
  Pie,
  PieChart,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { useEffect, useState } from "react";

// Nutrients we care about
const trackedNutrients = ["Protein", "Carbohydrate, by difference", "Total lipid (fat)"];

// Colors for the chart slices
const COLORS = ["#74D4FF", "#FFA500", "#8BC34A"];

export default function NutritionPieChart() {
  const [chartData, setChartData] = useState<
    { name: string; value: number }[]
  >([]);

  useEffect(() => {
    const rawData = JSON.parse(sessionStorage.getItem("foodJournal") || "[]");
    const today = new Date().toISOString().split("T")[0];

    const todayEntries = rawData.filter((entry: any) => {
      const entryDate = new Date(entry.date).toISOString().split("T")[0];
      return entryDate === today;
    });

    const nutrientTotals: Record<string, number> = {};

    todayEntries.forEach((entry: any) => {
      entry.meal?.forEach((food: any) => {
        food.foodNutrients?.forEach((n: any) => {
          if (trackedNutrients.includes(n.nutrientName)) {
            nutrientTotals[n.nutrientName] =
              (nutrientTotals[n.nutrientName] || 0) + n.value;
          }
        });
      });
    });

    const formattedData = trackedNutrients.map((name) => ({
        name:
          name === "Carbohydrate, by difference"
            ? "Carbohydrates"
            : name === "Total lipid (fat)"
            ? "Fat"
            : name,
        value: Math.round(nutrientTotals[name] || 0),
      }));
      

    setChartData(formattedData);
  }, []);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Nutrient Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              outerRadius={80}
              label
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
