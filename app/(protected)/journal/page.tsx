import React from "react";
import { Bar, BarChart } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { type ChartConfig } from "@/components/ui/chart"
import MainLayout from "@/components/MainLayout"


  // const chartData = [
  //   { month: "January", desktop: 186, mobile: 80 },
  //   { month: "February", desktop: 305, mobile: 200 },
  //   { month: "March", desktop: 237, mobile: 120 },
  //   { month: "April", desktop: 73, mobile: 190 },
  //   { month: "May", desktop: 209, mobile: 130 },
  //   { month: "June", desktop: 214, mobile: 140 },
  // ]

  // const chartConfig = {
  //   desktop: {
  //     label: "Desktop",
  //     color: "#2563eb",
  //   },
  //   mobile: {
  //     label: "Mobile",
  //     color: "#60a5fa",
  //   },
  // } satisfies ChartConfig
  
  // function Component() {
  //   return (
  //     <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
  //       <BarChart accessibilityLayer data={chartData}>
  //         <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
  //         <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
  //       </BarChart>
  //     </ChartContainer>
  //   )
  // }

export default function JournalPage() {
  return (
    <MainLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Daily Journal</h1>
        <p className="text-muted-foreground mb-6">
          Log your food intake, water intake, and calories burned or added here.
        </p>
        <div className="space-y-4">
          <div className="p-4 border rounded-md bg-card">
            <h2 className="text-lg font-medium">Your Progress</h2>
            {/* <Component /> */}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}