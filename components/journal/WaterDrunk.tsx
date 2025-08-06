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
import { useState, useEffect} from "react"
import { saveWaterToSupabase } from "@/lib/supabase/water"; 
import { supabase } from "@/lib/supabase/client" 

const DAILY_GOAL_MAX = 2000
const DAILY_GOAL_MIN = 1500 //maybe add a second colour to show radial passing min on to max?

function WaterDrunk() {
  const [waterDrunk, setWaterDrunk] = useState(0)

  // Fetch today's total water on component mount
  useEffect(() => {
    const fetchTodayWater = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("User not authenticated", userError)
        return
      }

      const today = new Date().toISOString().split("T")[0]; // "2025-08-06"

const { data, error } = await supabase
  .from("water_entry") // make sure this matches your actual table name
  .select("amount, created_at")
  .eq("user_id", user.id);

if (error) {
  console.error("Failed to fetch water data:", error.message);
  return;
}

// Filter entries that match today’s date
const todaysTotal = (data || [])
  .filter(entry => {
    const entryDate = new Date(entry.created_at).toISOString().split("T")[0];
    return entryDate === today;
  })
  .reduce((sum, entry) => sum + entry.amount, 0);

setWaterDrunk(todaysTotal);
    }

    fetchTodayWater()
  }, [])

  const percent = Math.min((waterDrunk / DAILY_GOAL_MAX) * 100, 100)

  const chartData = [
    {
      name: "Water",
      value: waterDrunk,
      percent,
    },
  ]

  const handleAddWater = async () => {
    const newAmount = waterDrunk + 250
    setWaterDrunk(newAmount)

    try {
      await saveWaterToSupabase(newAmount)
      console.log("Water saved to Supabase:", newAmount)
    } catch (error) {
      console.error("Failed to save water:", error)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Water</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={{ water: { label: "Water" } }} className="mx-auto aspect-square max-h-[250px]">
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-270}
            innerRadius={80}
            outerRadius={110}
          >
            <PolarGrid gridType="circle" radialLines={false} stroke="none" polarRadius={[86, 74]} />
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="percent" angleAxisId={0} background cornerRadius={10} fill="#74D4FF" />
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
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-4xl font-bold">
                          {waterDrunk}ml
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
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