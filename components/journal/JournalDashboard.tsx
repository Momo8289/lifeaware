"use client";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  } from "recharts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {useState, useEffect} from 'react';

//retrieve session data a nd display food journal stats. 
//note to future devs: This feature should be ultimately integrated into the SupaBase with 
//a proper data table creates for storage of meal data

export function getFoodJournalData(){
    //retrieve the data 

    const [data, setData] = useState([]);

    useEffect(() => {
        const rawData = JSON.parse(sessionStorage.getItem("foodJournal") || "[]");
        const transformedData = rawData.map((entry : any) => {
            //make date string readable
            const date = new Date(entry.date).toISOString().split("T")[0];
            //declare calories(cals), protein(prots) and carbs
            let cals =0, prots = 0, carbs = 0;
            //assign them values
            entry.meal?.forEach((food : any) => {
                food.foodNutrients?.forEach((n: any) => {
                    if (n.nutrientName === "Energy") cals += n.value;
                    if (n.nutrientName === "Protein") prots += n.value;
                    if (n.nutrientName === "Carbohydrate, by difference") carbs += n.value;    
                });
            });

            return {date, cals, prots, carbs}
        });

        setData(transformedData);
        //or return an empty string
    }, []);

    return data;
}

//component to render chart
function JournalDashboard(){
const chartData = getFoodJournalData();

return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Nutrition Overview</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {chartData.length === 0 ? (
          <p>No journal data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCarbs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ffc658" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="cals"
                stroke="#8884d8"
                fillOpacity={1}
                fill="url(#colorCals)"
                name="Calories"
              />
              <Area
                type="monotone"
                dataKey="prots"
                stroke="#82ca9d"
                fillOpacity={1}
                fill="url(#colorProts)"
                name="Protein"
              />
              <Area
                type="monotone"
                dataKey="carbs"
                stroke="#ffc658"
                fillOpacity={1}
                fill="url(#colorCarbs)"
                name="Carbs"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
    




export default JournalDashboard;