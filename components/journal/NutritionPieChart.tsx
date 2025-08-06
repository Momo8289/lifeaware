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
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { useEffect, useState } from "react";
import { useJournalData } from "@/lib/hooks/useJournalData";
import type { JournalData } from "@/lib/hooks/useJournalData";

// Nutrients we care about
const trackedNutrients = [
  "Protein",
  "Carbohydrate, by difference",
  "Total lipid (fat)",
];

// Colors for the chart slices
const COLORS = ["#74D4FF", "#FFA500", "#8BC34A"];

export default function NutritionPieChart() {
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>(
    []
  );
  const { data: journalData } = useJournalData();
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
  
    const todaysEntries = journalData.filter(
      (entry: JournalData) => entry.date === today
    );
  
    let proteinTotal = 0;
    let carbTotal = 0;
    let fatTotal = 0;
  
    todaysEntries.forEach((entry) => {
      proteinTotal += entry.prots || 0;
      carbTotal += entry.carbs || 0;
      // If you later add fat field: fatTotal += entry.fats || 0;
    });
  
    const formattedData = [
      { name: "Protein", value: Math.round(proteinTotal) },
      { name: "Carbohydrates", value: Math.round(carbTotal) },
      { name: "Fat", value: Math.round(fatTotal) },
    ];
  
    setChartData(formattedData);
  }, [journalData]);
  
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
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
      <CardFooter className="flex-col gap-2 text-sm"> 
      <div className="text-muted-foreground leading-none text-center">
        Breakdown of todays consumed protein, carboydrates, and fats.
     </div>
      </CardFooter>

    </Card>
  );
}
