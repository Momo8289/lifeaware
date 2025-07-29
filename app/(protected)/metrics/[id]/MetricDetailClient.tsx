'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Calendar, Edit, Trash2, Plus, Scale, Activity, Thermometer, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import Link from 'next/link';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DatePicker } from "@/components/ui/date-picker";

interface MetricTemplate {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  value_type: 'number' | 'bloodpressure' | 'bloodsugar';
  base_min: number | null;
  base_max: number | null;
  target_min: number | null;
  target_max: number | null;
  is_active: boolean;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

interface MetricLog {
  id: string;
  metric_template_id: string;
  recorded_at: string;
  value_numeric: number | null;
  value_systolic: number | null;
  value_diastolic: number | null;
  value_bloodsugar: number | null;
  context: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  value_numeric: string;
  value_systolic: string;
  value_diastolic: string;
  value_bloodsugar: string;
  notes: string;
  recorded_at: Date;
}

export default function MetricDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [metric, setMetric] = useState<MetricTemplate | null>(null);
  const [logs, setLogs] = useState<MetricLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [formData, setFormData] = useState<FormData>({
    value_numeric: '',
    value_systolic: '',
    value_diastolic: '',
    value_bloodsugar: '',
    notes: '',
    recorded_at: new Date()
  });

  const fetchMetric = async () => {
    try {
      setIsLoading(true);
      
      // Fetch the metric template
      const { data: metricData, error: metricError } = await supabase
        .from('metric_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (metricError) throw metricError;
      
      setMetric(metricData);
      
      // Fetch logs based on time range
      await fetchLogs();
    } catch (error) {
      // Silent error handling for production
      toast({
        title: "Error",
        description: "Failed to load metric data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      let startDate;
      
      switch (timeRange) {
        case '7d':
          startDate = subDays(new Date(), 7);
          break;
        case '30d':
          startDate = subDays(new Date(), 30);
          break;
        case '90d':
          startDate = subDays(new Date(), 90);
          break;
        case '1y':
          startDate = subDays(new Date(), 365);
          break;
        default:
          startDate = subDays(new Date(), 7);
      }
      
      const { data: logsData, error: logsError } = await supabase
        .from('metric_logs')
        .select('*')
        .eq('metric_template_id', id)
        .gte('recorded_at', startOfDay(startDate).toISOString())
        // .lte('recorded_at', endOfDay(new Date()).toISOString())
        .order('recorded_at', { ascending: true });

      if (logsError) throw logsError;
      
      setLogs(logsData || []);
    } catch (error) {
      // Silent error handling for production
    }
  };

  useEffect(() => {
    fetchMetric();
  }, [id]);

  useEffect(() => {
    if (metric) {
      fetchLogs();
    }
  }, [timeRange, metric]);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!metric) return;
    
    // Validate based on value type
    if (metric.value_type === 'number' && !formData.value_numeric) {
      toast({
        title: "Error",
        description: "Please enter a numeric value",
        variant: "destructive"
      });
      return;
    }
    
    if (metric.value_type === 'bloodpressure' && (!formData.value_systolic || !formData.value_diastolic)) {
      toast({
        title: "Error",
        description: "Please enter both systolic and diastolic values",
        variant: "destructive"
      });
      return;
    }
    
    if (metric.value_type === 'bloodsugar' && !formData.value_bloodsugar) {
      toast({
        title: "Error",
        description: "Please enter a blood sugar value",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare values
      const value_numeric = formData.value_numeric ? parseFloat(formData.value_numeric) : null;
      const value_systolic = formData.value_systolic ? parseInt(formData.value_systolic) : null;
      const value_diastolic = formData.value_diastolic ? parseInt(formData.value_diastolic) : null;
      const value_bloodsugar = formData.value_bloodsugar ? parseFloat(formData.value_bloodsugar) : null;
      
      // Insert log
      const { data, error } = await supabase
        .from('metric_logs')
        .insert({
          metric_template_id: metric.id,
          recorded_at: formData.recorded_at.toISOString(),
          value_numeric,
          value_systolic,
          value_diastolic,
          value_bloodsugar,
          notes: formData.notes || null
        });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Measurement logged successfully",
      });
      
      // Reset form
      setFormData({
        value_numeric: '',
        value_systolic: '',
        value_diastolic: '',
        value_bloodsugar: '',
        notes: '',
        recorded_at: new Date()
      });
      
      // Refresh logs
      fetchLogs();
    } catch (error: any) {
      // Silent error handling for production
      toast({
        title: "Error",
        description: typeof error === 'object' && error.message 
          ? error.message 
          : "Failed to log measurement",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('metric_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Log entry deleted",
      });
      
      // Refresh logs
      fetchLogs();
    } catch (error) {
      // Silent error handling for production
      toast({
        title: "Error",
        description: "Failed to delete log entry",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMetric = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    
    try {
      // Delete metric template (cascade will delete logs)
      const { error } = await supabase
        .from('metric_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Metric deleted successfully",
      });
      
      router.push('/metrics');
    } catch (error) {
      // Silent error handling for production
      toast({
        title: "Error",
        description: "Failed to delete metric",
        variant: "destructive"
      });
      setDeleteConfirm(false);
    }
  };

  const getChartData = () => {
    if (!logs.length) return [];
    
    return logs.map(log => {
      const date = format(new Date(log.recorded_at), 'MMM d');
      
      if (metric?.value_type === 'number') {
        return {
          date,
          value: log.value_numeric
        };
      } else if (metric?.value_type === 'bloodpressure') {
        return {
          date,
          systolic: log.value_systolic,
          diastolic: log.value_diastolic
        };
      } else if (metric?.value_type === 'bloodsugar') {
        return {
          date,
          value: log.value_bloodsugar
        };
      }
      
      return { date };
    });
  };

  const getRangeColor = (value: number | null) => {
    if (!metric || value === null) return 'text-muted-foreground';
    
    // Check against normal range if available
    if (metric.base_min !== null && metric.base_max !== null) {
      if (value < metric.base_min) return 'text-yellow-500';
      if (value > metric.base_max) return 'text-destructive';
      return 'text-green-500';
    }
    
    // Check against target range if available
    if (metric.target_min !== null && metric.target_max !== null) {
      if (value < metric.target_min) return 'text-yellow-500';
      if (value > metric.target_max) return 'text-destructive';
      return 'text-green-500';
    }
    
    return 'text-muted-foreground';
  };

  const getRecentTrend = () => {
    if (logs.length < 2) return null;
    
    const recent = logs.slice(-2);
    const current = recent[1];
    const previous = recent[0];
    
    let currentValue: number | null = null;
    let previousValue: number | null = null;
    
    if (metric?.value_type === 'number') {
      currentValue = current.value_numeric;
      previousValue = previous.value_numeric;
    } else if (metric?.value_type === 'bloodpressure') {
      // Use systolic as the main indicator
      currentValue = current.value_systolic;
      previousValue = previous.value_systolic;
    } else if (metric?.value_type === 'bloodsugar') {
      currentValue = current.value_bloodsugar;
      previousValue = previous.value_bloodsugar;
    }
    
    if (currentValue === null || previousValue === null) return null;
    
    const isBloodValue = metric?.value_type === 'bloodpressure' || metric?.value_type === 'bloodsugar';
    const percentChange = ((currentValue - previousValue) / previousValue) * 100;
    const isSignificant = Math.abs(percentChange) > 1; // More than 1% change
    
    if (!isSignificant) {
      return (
        <div className="flex items-center gap-1 text-yellow-500">
          <Minus className="h-4 w-4" />
          <span>Steady</span>
        </div>
      );
    }
    
    if (currentValue > previousValue) {
      // For blood values, increase is typically bad
      return (
        <div className={`flex items-center gap-1 ${isBloodValue ? 'text-destructive' : 'text-green-500'}`}>
          <ChevronUp className="h-4 w-4" />
          <span>{Math.abs(percentChange).toFixed(1)}% increase</span>
        </div>
      );
    } else {
      // For blood values, decrease is typically good
      return (
        <div className={`flex items-center gap-1 ${isBloodValue ? 'text-green-500' : 'text-destructive'}`}>
          <ChevronDown className="h-4 w-4" />
          <span>{Math.abs(percentChange).toFixed(1)}% decrease</span>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <p>Loading metric data...</p>
      </div>
    );
  }

  if (!metric) {
    return (
      <div className="container py-6 space-y-6">
        <p>Metric not found</p>
        <Link href="/metrics">
          <Button>Back to Metrics</Button>
        </Link>
      </div>
    );
  }

  const getMetricIcon = () => {
    if (metric.value_type === 'number') {
      return <Scale className="h-6 w-6" />;
    } else if (metric.value_type === 'bloodpressure') {
      return <Activity className="h-6 w-6" />;
    } else if (metric.value_type === 'bloodsugar') {
      return <Thermometer className="h-6 w-6" />;
    }
    
    return null;
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/metrics">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {getMetricIcon()}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{metric.name}</h1>
              <p className="text-muted-foreground">{metric.description}</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/metrics/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button 
            variant="destructive" 
            onClick={handleDeleteMetric}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteConfirm ? 'Confirm Delete' : 'Delete'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="log">Log Measurement</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Unit</div>
                  <div>{metric.unit}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium">Value Type</div>
                  <div>{metric.value_type.charAt(0).toUpperCase() + metric.value_type.slice(1)}</div>
                </div>
                
                {metric.base_min !== null && metric.base_max !== null && (
                  <div>
                    <div className="text-sm font-medium">Normal Range</div>
                    <div>{metric.base_min} - {metric.base_max} {metric.unit}</div>
                  </div>
                )}
                
                {metric.target_min !== null && metric.target_max !== null && (
                  <div>
                    <div className="text-sm font-medium">Target Range</div>
                    <div>{metric.target_min} - {metric.target_max} {metric.unit}</div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm font-medium">Status</div>
                  <div>{metric.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium">Total Measurements</div>
                  <div>{logs.length}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Trend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {logs.length >= 2 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="text-2xl font-bold">
                        {logs[logs.length - 1].value_numeric !== null && (
                          <span>{logs[logs.length - 1].value_numeric} {metric.unit}</span>
                        )}
                        {logs[logs.length - 1].value_systolic !== null && logs[logs.length - 1].value_diastolic !== null && (
                          <span>{logs[logs.length - 1].value_systolic}/{logs[logs.length - 1].value_diastolic} {metric.unit}</span>
                        )}
                        {logs[logs.length - 1].value_bloodsugar !== null && (
                          <span>{logs[logs.length - 1].value_bloodsugar} {metric.unit}</span>
                        )}
                      </div>
                      {getRecentTrend()}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Last measured: {format(new Date(logs[logs.length - 1].recorded_at), 'MMMM d, yyyy')}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p>Not enough data to determine trend</p>
                    <p className="text-sm text-muted-foreground">Log at least 2 measurements</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Trend Chart</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={timeRange === '7d' ? 'default' : 'outline'} 
                    onClick={() => setTimeRange('7d')}
                    size="sm"
                  >
                    7 Days
                  </Button>
                  <Button 
                    variant={timeRange === '30d' ? 'default' : 'outline'} 
                    onClick={() => setTimeRange('30d')}
                    size="sm"
                  >
                    30 Days
                  </Button>
                  <Button 
                    variant={timeRange === '90d' ? 'default' : 'outline'} 
                    onClick={() => setTimeRange('90d')}
                    size="sm"
                  >
                    90 Days
                  </Button>
                  <Button 
                    variant={timeRange === '1y' ? 'default' : 'outline'} 
                    onClick={() => setTimeRange('1y')}
                    size="sm"
                  >
                    1 Year
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {metric.value_type === 'bloodpressure' ? (
                      <LineChart
                        data={getChartData()}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="systolic" 
                          stroke="#ef4444"
                          name="Systolic"
                          activeDot={{ r: 8 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="diastolic" 
                          stroke="#3b82f6"
                          name="Diastolic"
                        />
                      </LineChart>
                    ) : (
                      <LineChart
                        data={getChartData()}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3b82f6"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p>No data to display</p>
                  <p className="text-sm text-muted-foreground">Start logging measurements to see your trends</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="log" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Log New Measurement</CardTitle>
              <CardDescription>Record a new measurement for {metric.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="log-form" onSubmit={handleSubmitLog} className="space-y-6">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <DatePicker
                    date={formData.recorded_at}
                    setDate={(date) => date && handleChange('recorded_at', date)}
                  />
                  <p>{formData.recorded_at.toLocaleString()}</p>
                  <Label htmlFor="time">Time</Label>
                  <Input
                      id="time"
                      type="time"
                      value={`${formData.recorded_at.getHours()}:${formData.recorded_at.getMinutes()}`}
                      onChange={(e) => {
                        if(!e.target.value) return;
                        const newDate = new Date(formData.recorded_at.getTime())
                        newDate.setHours(parseInt(e.target.value.split(":")[0]))
                        newDate.setMinutes(parseInt(e.target.value.split(":")[1]))
                        handleChange("recorded_at", newDate)
                      }}
                  />
                </div>
                
                {metric.value_type === 'number' && (
                  <div className="space-y-2">
                    <Label htmlFor="value_numeric">Value ({metric.unit})</Label>
                    <Input
                      id="value_numeric"
                      type="number"
                      step="0.01"
                      placeholder={`Enter value in ${metric.unit}`}
                      value={formData.value_numeric}
                      onChange={(e) => handleChange('value_numeric', e.target.value)}
                      required
                    />
                  </div>
                )}
                
                {metric.value_type === 'bloodpressure' && (
                  <div className="space-y-2">
                    <Label>Blood Pressure ({metric.unit})</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="value_systolic" className="text-sm text-muted-foreground">Systolic</Label>
                        <Input
                          id="value_systolic"
                          type="number"
                          placeholder="Systolic"
                          value={formData.value_systolic}
                          onChange={(e) => handleChange('value_systolic', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="value_diastolic" className="text-sm text-muted-foreground">Diastolic</Label>
                        <Input
                          id="value_diastolic"
                          type="number"
                          placeholder="Diastolic"
                          value={formData.value_diastolic}
                          onChange={(e) => handleChange('value_diastolic', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {metric.value_type === 'bloodsugar' && (
                  <div className="space-y-2">
                    <Label htmlFor="value_bloodsugar">Blood Sugar ({metric.unit})</Label>
                    <Input
                      id="value_bloodsugar"
                      type="number"
                      step="0.1"
                      placeholder={`Enter value in ${metric.unit}`}
                      value={formData.value_bloodsugar}
                      onChange={(e) => handleChange('value_bloodsugar', e.target.value)}
                      required
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes about this measurement"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button type="submit" form="log-form" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Measurement'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Measurement History</CardTitle>
              <CardDescription>All recorded measurements for {metric.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-6">
                  <p>No measurements recorded yet</p>
                  <Button className="mt-4" onClick={() => setActiveTab('log')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log First Measurement
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.slice().reverse().map((log) => (
                    <div key={log.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{format(new Date(log.recorded_at), 'MMMM d, yyyy')}</span>
                            <span className="text-sm text-muted-foreground">{format(new Date(log.recorded_at), 'h:mm a')}</span>
                          </div>
                          
                          <div className="mt-2 text-xl font-bold">
                            {log.value_numeric !== null && (
                              <span className={getRangeColor(log.value_numeric)}>
                                {log.value_numeric} {metric.unit}
                              </span>
                            )}
                            {log.value_systolic !== null && log.value_diastolic !== null && (
                              <span className={getRangeColor(log.value_systolic)}>
                                {log.value_systolic}/{log.value_diastolic} {metric.unit}
                              </span>
                            )}
                            {log.value_bloodsugar !== null && (
                              <span className={getRangeColor(log.value_bloodsugar)}>
                                {log.value_bloodsugar} {metric.unit}
                              </span>
                            )}
                          </div>
                          
                          {log.context && (
                            <div className="text-sm mt-1">
                              Context: <span className="text-muted-foreground">{log.context}</span>
                            </div>
                          )}
                          
                          {log.notes && (
                            <div className="text-sm mt-1">
                              Notes: <span className="text-muted-foreground">{log.notes}</span>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteLog(log.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 