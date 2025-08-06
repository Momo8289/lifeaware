"use client"

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
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
import { Button } from "../ui/button"
import { useState, useEffect } from "react"
import { saveWaterToSupabase } from "@/lib/supabase/water"; // adjust path as needed


const DAILY_GOAL_MAX = 2000
const DAILY_GOAL_MIN = 1500

function WaterDrunk() {
  const [waterDrunk, setWaterDrunk] = useState(0)

  // Load from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("water")
    if (stored) {
      setWaterDrunk(Number(stored))
    }
  }, [])

  // Save to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem("water", String(waterDrunk))
  }, [waterDrunk])

  const percent = Math.min((waterDrunk / DAILY_GOAL_MAX) * 100, 100)
  const chartConfig = {
    water: {
      label: "Water",
    }
  } satisfies ChartConfig;

  const chartData = [
    {
      name: "Water",
      value: waterDrunk,
      percent,
    },
  ]

  const handleAddWater = async () => {
    const newAmount = waterDrunk + 250;
    setWaterDrunk(newAmount);
  
    try {
      await saveWaterToSupabase(newAmount);
      console.log("Water saved to Supabase:", newAmount);
    } catch (error) {
      console.error("Failed to save water:", error);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Water</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]">
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
              polarRadius={[86, 74]}
            />
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              dataKey="percent"
              angleAxisId={0}
              background
              cornerRadius={10}
              fill="#74D4FF"
            />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]}>
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
                          {waterDrunk}ml
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Drunk
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
       <Button onClick={handleAddWater}>+ 250ml</Button>
        <div className="text-muted-foreground text-center">
          The average adult should consume between 1500ml and 2000ml a day.
        </div>
      
      </CardFooter>
    </Card>
  )
}

export default WaterDrunk
