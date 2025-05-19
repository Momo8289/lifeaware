"use client"

import { 
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"

interface HabitLog {
  id: string
  habit_id: string
  completion_date: string
  status: 'completed' | 'missed' | 'skipped'
  notes: string | null
  created_at: string
}

interface HabitCompletionChartProps {
  logs: HabitLog[]
  title?: string
  description?: string
}

export function HabitCompletionChart({
  logs,
  title = "Habit Completion",
  description = "Track your progress"
}: HabitCompletionChartProps) {
  // Calculate total completed
  const totalCompleted = logs.filter(log => log.status === 'completed').length;
  
  // Calculate completion trend (comparing last 7 days vs previous 7 days)
  const today = new Date();
  const last7Days = new Date();
  const previous7Days = new Date();
  last7Days.setDate(today.getDate() - 7);
  previous7Days.setDate(today.getDate() - 14);
  
  const completionsLastWeek = logs.filter(log => {
    const logDate = new Date(log.completion_date);
    return logDate >= last7Days && logDate <= today && log.status === 'completed';
  }).length;
  
  const completionsPreviousWeek = logs.filter(log => {
    const logDate = new Date(log.completion_date);
    return logDate >= previous7Days && logDate < last7Days && log.status === 'completed';
  }).length;
  
  // Calculate percentage change
  let trend = 0;
  if (completionsPreviousWeek > 0) {
    trend = ((completionsLastWeek - completionsPreviousWeek) / completionsPreviousWeek) * 100;
  } else if (completionsLastWeek > 0) {
    trend = 100; // If previous week had 0, but this week has completions, that's a 100% increase
  }
  
  const isTrendUp = trend >= 0;
  const trendText = isTrendUp ? "up" : "down";
  const trendAbs = Math.abs(trend).toFixed(1);
  
  // Chart data
  const chartData = [
    { name: "completed", value: totalCompleted, fill: "var(--color-completed)" }
  ];
  
  // Chart config
  const chartConfig = {
    completed: {
      label: "Completed",
      color: "hsl(var(--success))"
    }
  } satisfies ChartConfig;
  
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={0}
            endAngle={250}
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
            <RadialBar dataKey="value" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
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
                          {totalCompleted.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Completed
                        </tspan>
                      </text>
                    )
                  }
                  return null;
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        {logs.length > 0 && (
          <div className="flex items-center gap-2 font-medium leading-none">
            Trending {trendText} by {trendAbs}% this week {' '}
            {isTrendUp ? 
              <TrendingUp className="h-4 w-4 text-success" /> : 
              <TrendingDown className="h-4 w-4 text-destructive" />
            }
          </div>
        )}
        <div className="leading-none text-muted-foreground">
          Showing total completions over time
        </div>
      </CardFooter>
    </Card>
  )
} 