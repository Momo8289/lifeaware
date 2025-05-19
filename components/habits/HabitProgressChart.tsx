"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Legend, 
  Line, 
  LineChart, 
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts"

interface HabitLog {
  id: string
  habit_id: string
  completion_date: string
  status: 'completed' | 'missed' | 'skipped'
  notes: string | null
  created_at: string
}

interface HabitChartProps {
  logs: HabitLog[]
  type?: 'line' | 'area' | 'bar' | 'pie'
  title?: string
  description?: string
}

// Define theme-compatible colors
const CHART_COLORS = {
  completed: "hsl(var(--success))",
  completedOpacity: "hsla(var(--success), 0.6)",
  missed: "hsl(var(--destructive))",
  missedOpacity: "hsla(var(--destructive), 0.6)",
  skipped: "hsl(var(--warning))",
  skippedOpacity: "hsla(var(--warning), 0.6)"
}

export function HabitProgressChart({
  logs,
  type = 'line',
  title = "Habit Progress",
  description = "Track your habit completion rate over time",
}: HabitChartProps) {
  // Process data for charts
  const processedData = processLogs(logs)
  
  // Choose the chart type based on props
  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-muted-foreground text-xs" 
                stroke="hsl(var(--muted-foreground))" 
                tickLine={false}
              />
              <YAxis 
                className="text-muted-foreground text-xs" 
                stroke="hsl(var(--muted-foreground))" 
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))", 
                  color: "hsl(var(--foreground))" 
                }}
                formatter={(value, name) => {
                  // Apply correct color based on data name
                  const color = name === "completed" 
                    ? CHART_COLORS.completed 
                    : name === "missed" 
                    ? CHART_COLORS.missed 
                    : CHART_COLORS.skipped;
                  
                  // Format the label with proper capitalization
                  const formattedName = typeof name === 'string' 
                    ? name.charAt(0).toUpperCase() + name.slice(1)
                    : String(name);
                  
                  return [
                    <span style={{ color }}>{value}</span>,
                    <span style={{ color }}>{formattedName}</span>
                  ];
                }}
              />
              <Legend />
              {/* Display in reverse order to ensure proper visibility */}
              <Area
                type="monotone"
                dataKey="skipped"
                stroke={CHART_COLORS.skipped}
                fill={CHART_COLORS.skipped}
                fillOpacity={0.3}
                dot={{ fill: CHART_COLORS.skipped, r: 4 }}
                activeDot={{ fill: CHART_COLORS.skipped, r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="missed"
                stroke={CHART_COLORS.missed}
                fill={CHART_COLORS.missed}
                fillOpacity={0.3}
                dot={{ fill: CHART_COLORS.missed, r: 4 }}
                activeDot={{ fill: CHART_COLORS.missed, r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke={CHART_COLORS.completed}
                fill={CHART_COLORS.completed}
                fillOpacity={0.3}
                dot={{ fill: CHART_COLORS.completed, r: 4 }}
                activeDot={{ fill: CHART_COLORS.completed, r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-muted-foreground text-xs" 
                stroke="hsl(var(--muted-foreground))" 
                tickLine={false}
              />
              <YAxis 
                className="text-muted-foreground text-xs" 
                stroke="hsl(var(--muted-foreground))" 
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))", 
                  color: "hsl(var(--foreground))" 
                }}
                formatter={(value, name) => {
                  // Apply correct color based on data name
                  const color = name === "completed" 
                    ? CHART_COLORS.completed 
                    : name === "missed" 
                    ? CHART_COLORS.missed 
                    : CHART_COLORS.skipped;
                  
                  // Format the label with proper capitalization
                  const formattedName = typeof name === 'string' 
                    ? name.charAt(0).toUpperCase() + name.slice(1)
                    : String(name);
                  
                  return [
                    <span style={{ color }}>{value}</span>,
                    <span style={{ color }}>{formattedName}</span>
                  ];
                }}
              />
              <Legend />
              <Bar dataKey="skipped" fill={CHART_COLORS.skipped} />
              <Bar dataKey="missed" fill={CHART_COLORS.missed} />
              <Bar dataKey="completed" fill={CHART_COLORS.completed} />
            </BarChart>
          </ResponsiveContainer>
        )
      
      case 'pie':
        // Aggregate totals for pie chart
        const totals = {
          completed: processedData.reduce((sum, item) => sum + item.completed, 0),
          missed: processedData.reduce((sum, item) => sum + item.missed, 0),
          skipped: processedData.reduce((sum, item) => sum + item.skipped, 0),
        }
        
        const pieData = [
          { name: "Completed", value: totals.completed, color: CHART_COLORS.completed },
          { name: "Missed", value: totals.missed, color: CHART_COLORS.missed },
          { name: "Skipped", value: totals.skipped, color: CHART_COLORS.skipped },
        ]
        
        return (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => 
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))", 
                  color: "hsl(var(--foreground))" 
                }}
                formatter={(value, name) => {
                  // Apply correct color based on data name
                  const color = name === "Completed" 
                    ? CHART_COLORS.completed 
                    : name === "Missed" 
                    ? CHART_COLORS.missed 
                    : CHART_COLORS.skipped;
                  
                  // Format the label with proper capitalization
                  const formattedName = typeof name === 'string' 
                    ? name.charAt(0).toUpperCase() + name.slice(1)
                    : String(name);
                  
                  return [
                    <span style={{ color }}>{value}</span>,
                    <span style={{ color }}>{formattedName}</span>
                  ];
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )
        
      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-muted-foreground text-xs" 
                stroke="hsl(var(--muted-foreground))" 
                tickLine={false}
              />
              <YAxis 
                className="text-muted-foreground text-xs" 
                stroke="hsl(var(--muted-foreground))" 
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))", 
                  color: "hsl(var(--foreground))" 
                }}
                formatter={(value, name) => {
                  // Apply correct color based on data name
                  const color = name === "completed" 
                    ? CHART_COLORS.completed 
                    : name === "missed" 
                    ? CHART_COLORS.missed 
                    : CHART_COLORS.skipped;
                  
                  // Format the label with proper capitalization
                  const formattedName = typeof name === 'string' 
                    ? name.charAt(0).toUpperCase() + name.slice(1)
                    : String(name);
                  
                  return [
                    <span style={{ color }}>{value}</span>,
                    <span style={{ color }}>{formattedName}</span>
                  ];
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="skipped"
                stroke={CHART_COLORS.skipped}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.skipped, r: 4 }}
                activeDot={{ r: 8, fill: CHART_COLORS.skipped }}
              />
              <Line
                type="monotone"
                dataKey="missed"
                stroke={CHART_COLORS.missed}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.missed, r: 4 }}
                activeDot={{ r: 8, fill: CHART_COLORS.missed }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke={CHART_COLORS.completed}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.completed, r: 4 }}
                activeDot={{ r: 8, fill: CHART_COLORS.completed }}
              />
            </LineChart>
          </ResponsiveContainer>
        )
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  )
}

// Helper function to process log data for charts
function processLogs(logs: HabitLog[]) {
  // Create a map to organize logs by date
  const dateMap = new Map<string, { completed: number, missed: number, skipped: number }>()
  
  // Process each log entry
  logs.forEach(log => {
    const date = log.completion_date.split('T')[0]
    
    if (!dateMap.has(date)) {
      dateMap.set(date, { completed: 0, missed: 0, skipped: 0 })
    }
    
    const dateData = dateMap.get(date)!
    
    if (log.status === 'completed') {
      dateData.completed += 1
    } else if (log.status === 'missed') {
      dateData.missed += 1
    } else if (log.status === 'skipped') {
      dateData.skipped += 1
    }
  })
  
  // Convert map to array and sort by date
  return Array.from(dateMap.entries())
    .map(([date, stats]) => ({
      date,
      ...stats
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
} 