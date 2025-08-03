//component to show calories eaten on the current date in journal main page
"use client"

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import {useState, useEffect} from 'react';


export const description = "A radial chart of calorific date taken from today's Journal entries."


 function useCaloriesData(){
    //retrieve the data 

    const [data, setData] = useState<{ name: string; calories: number; percent: number }[]>([])

    useEffect(() => {
        const rawData = JSON.parse(sessionStorage.getItem("foodJournal") || "[]")
    
        let totalCalories = 0
        rawData.forEach((entry: any) => {
          const entryDate = new Date(entry.date).toISOString().split("T")[0]
          const today = new Date().toISOString().split("T")[0]
    
          if (entryDate === today) {
            entry.meal?.forEach((food: any) => {
              food.foodNutrients?.forEach((n: any) => {
                if (n.nutrientName === "Energy") {
                  totalCalories += n.value
                }
              })
            })
          }
        })
        const percent = Math.min((totalCalories / DAILY_GOAL) * 100, 100) // Cap at 100%

        setData([{ name: "Calories", calories: totalCalories, percent }])
        console.log(percent);
    }, [])

    return data;
}
    
const DAILY_GOAL = 2500;


const chartConfig = {
  cals: {
    label: "Calories",
  }
} satisfies ChartConfig


function CaloriesToday(){ 

const chartData = useCaloriesData();

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Calories</CardTitle>
        <CardDescription>Eaten Today</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-270}
            innerRadius={80}
            outerRadius={110}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />

            <RadialBar dataKey="percent" background cornerRadius={10} fill="#74D4FF" />
            <PolarRadiusAxis 
            tick={false} 
            tickLine={false} 
            axisLine={false} 
             domain={[0, 100]}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                         {chartData[0]?.calories?.toLocaleString() || "0"}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Calories
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        {/* <div className="flex items-center gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div> */}
        <div className="text-muted-foreground leading-none text-center">
          The average adult should consumer between 2000kcal and 25000kcal a day.
        </div>
      </CardFooter>
    </Card>
        )
    }


export default CaloriesToday;