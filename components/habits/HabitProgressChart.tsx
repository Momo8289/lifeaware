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
import { format, subDays, eachDayOfInterval, addDays, parseISO, isValid } from "date-fns"

interface HabitLog {
  id: string
  habit_id: string
  completion_date: string
  status: 'completed'
  notes: string | null
  created_at: string
}

interface Habit {
  id: string
  name: string
  completions: number
}

interface HabitChartProps {
  logs: HabitLog[]
  habits?: Habit[]
  type?: 'line' | 'area' | 'bar' | 'pie'
  title?: string
  description?: string
  showIndividualHabits?: boolean
}

// Generate a diverse color palette for individual habits
const generateHabitColors = (count: number) => {
  const baseColors = [
    "hsl(var(--primary))",
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(142, 76%, 36%)", // green
    "hsl(205, 100%, 50%)", // blue
    "hsl(276, 74%, 56%)", // purple
    "hsl(349, 100%, 59%)", // red
    "hsl(31, 100%, 58%)", // orange
    "hsl(60, 100%, 58%)", // yellow
    "hsl(180, 100%, 36%)", // teal
  ]
  
  // Return colors from the palette, and if we need more, just cycle through them
  return Array.from({ length: count }, (_, i) => baseColors[i % baseColors.length])
}

// Define theme-compatible colors
const CHART_COLORS = {
  completed: "hsl(var(--success))",
  completedOpacity: "hsla(var(--success), 0.6)",
  target: "hsl(var(--muted))",
  targetOpacity: "hsla(var(--muted), 0.5)",
  background: "hsl(var(--background))",
  muted: "hsl(var(--muted))",
  border: "hsl(var(--border))"
}

export function HabitProgressChart({
  logs,
  habits = [],
  type = 'line',
  title = "Habit Progress",
  description = "Track your habit completion rate over time",
  showIndividualHabits = false
}: HabitChartProps) {
  // Process data for charts
  const processedData = showIndividualHabits && habits.length > 0
    ? processLogsByHabit(logs, habits)
    : processLogs(logs)
  
  // Generate color palette for habits
  const habitColors = generateHabitColors(habits.length)
  
  // Choose the chart type based on props
  const renderChart = () => {
    if (showIndividualHabits && habits.length > 0) {
      // Render chart with individual habit lines
      switch (type) {
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
                />
                <Legend />
                {habits.map((habit, index) => (
                  <Bar 
                    key={habit.id} 
                    dataKey={habit.id} 
                    name={habit.name} 
                    fill={habitColors[index]} 
                    stackId="stack"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )
        
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
                />
                <Legend />
                {habits.map((habit, index) => (
                  <Area 
                    key={habit.id} 
                    type="monotone" 
                    dataKey={habit.id} 
                    name={habit.name} 
                    fill={habitColors[index]} 
                    stroke={habitColors[index]}
                    fillOpacity={0.3}
                    stackId="stack"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )
          
        case 'pie':
          // Aggregate completion counts by habit
          const habitCompletions = habits.map((habit, index) => ({
            name: habit.name,
            value: habit.completions,
            color: habitColors[index]
          }))
          
          return (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={habitCompletions}
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
                  {habitCompletions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))", 
                    color: "hsl(var(--foreground))" 
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
                />
                <Legend />
                {habits.map((habit, index) => (
                  <Line 
                    key={habit.id}
                    type="monotone"
                    dataKey={habit.id}
                    name={habit.name}
                    stroke={habitColors[index]}
                    strokeWidth={2}
                    dot={{ fill: habitColors[index], r: 4 }}
                    activeDot={{ r: 8, fill: habitColors[index] }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )
      }
    } else {
      // Original chart logic for aggregated data
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
                      : CHART_COLORS.target
                    
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
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke={CHART_COLORS.target}
                  fill={CHART_COLORS.target}
                  fillOpacity={0.2}
                  strokeDasharray="5 5"
                  dot={false}
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
                      : CHART_COLORS.target
                    
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
                <Bar dataKey="target" fill={CHART_COLORS.target} fillOpacity={0.5} />
                <Bar dataKey="completed" fill={CHART_COLORS.completed} />
              </BarChart>
            </ResponsiveContainer>
          )
        
        case 'pie':
          // Aggregate totals for pie chart
          const completedTotal = processedData.reduce((sum, item) => sum + item.completed, 0)
          const targetTotal = processedData.reduce((sum, item) => sum + item.target, 0)
          const incompleteTotal = targetTotal - completedTotal
          
          const pieData = [
            { name: "Completed", value: completedTotal, color: CHART_COLORS.completed },
            { name: "Incomplete", value: incompleteTotal > 0 ? incompleteTotal : 0, color: CHART_COLORS.target }
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
                      : CHART_COLORS.target
                    
                    return [
                      <span style={{ color }}>{value}</span>,
                      <span style={{ color }}>{name}</span>
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
                      : CHART_COLORS.target
                    
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
                  dataKey="target"
                  stroke={CHART_COLORS.target}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
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

// Helper function to process logs by individual habits
function processLogsByHabit(logs: HabitLog[], habits: Habit[]) {
  // Get date range (last 30 days)
  const endDate = new Date()
  const startDate = subDays(endDate, 29) // 30 days including today
  
  // Create an array of all dates in the range
  const dateRange = eachDayOfInterval({
    start: startDate,
    end: endDate
  })
  
  // Initialize data array with all dates
  const data = dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd')
    // Create an object with date properties
    const dataPoint: Record<string, any> = {
      date: format(date, 'MMM dd'), // Format for display on chart
      fullDate: dateStr // Keep full date for reference
    }
    
    // Initialize each habit with 0 for each date
    habits.forEach(habit => {
      dataPoint[habit.id] = 0
    })
    
    return dataPoint
  })
  
  // Fill in completion data for each habit
  logs.forEach(log => {
    const logDate = log.completion_date
    
    if (!isValid(parseISO(logDate))) return
    
    // Find the corresponding date in our data array
    const dataIndex = data.findIndex(d => d.fullDate === logDate)
    
    if (dataIndex !== -1 && log.status === 'completed') {
      // Increment the count for the specific habit
      if (data[dataIndex][log.habit_id] !== undefined) {
        data[dataIndex][log.habit_id] += 1
      }
    }
  })
  
  return data
}

// Helper function to process logs into aggregated chart data format
function processLogs(logs: HabitLog[]) {
  // Get date range (last 30 days)
  const endDate = new Date()
  const startDate = subDays(endDate, 29) // 30 days including today
  
  // Create an array of all dates in the range
  const dateRange = eachDayOfInterval({
    start: startDate,
    end: endDate
  })
  
  // Initialize data array with all dates and zero values
  const data = dateRange.map(date => {
    const dateString = format(date, 'yyyy-MM-dd')
    return {
      date: format(date, 'MMM dd'), // Format for display on chart
      completed: 0,
      target: 1, // Target is 1 completion per day
      fullDate: dateString // Keep full date for reference
    }
  })
  
  // Fill in actual completion data
  logs.forEach(log => {
    const logDate = log.completion_date
    
    if (!isValid(parseISO(logDate))) return
    
    // Find the corresponding date in our data array
    const dataIndex = data.findIndex(d => d.fullDate === logDate)
    
    if (dataIndex !== -1 && log.status === 'completed') {
      data[dataIndex].completed += 1
    }
  })
  
  return data
} 