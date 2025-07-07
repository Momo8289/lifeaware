'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, Scale, Activity, Thermometer, LineChart, Settings, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

// Types
interface MetricTemplate {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  value_type: 'number' | 'bloodpressure' | 'bloodsugar';
  normal_range_min: number | null;
  normal_range_max: number | null;
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
  measurement_date: string;
  value_numeric: number | null;
  value_systolic: number | null;
  value_diastolic: number | null;
  value_bloodsugar: number | null;
  context: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface MetricWithStats extends MetricTemplate {
  latest_log?: MetricLog;
  trend: 'increase' | 'decrease' | 'steady' | 'unknown';
  logs_count: number;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Get current user to ensure we're authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        setMetrics([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch metric templates - with RLS, this will only return the user's metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('metric_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (metricsError) throw metricsError;

      if (!metricsData) {
        setMetrics([]);
        return;
      }

      // Get the latest log for each metric
      const metricsWithStats: MetricWithStats[] = [];
      
      for (const metric of metricsData) {
        // Get latest log
        const { data: latestLog } = await supabase
          .from('metric_logs')
          .select('*')
          .eq('metric_template_id', metric.id)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .single();
        
        // Get trend using new API route
        let trendData = 'unknown';
        try {
          const response = await fetch('/api/metrics/trend', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ metric_template_id: metric.id }),
          });
          
          if (response.ok) {
            const result = await response.json();
            trendData = result.trend || 'unknown';
          }
        } catch (error) {
          console.error('Error fetching trend data:', error);
          // Use default value of 'unknown'
        }
        
        // Get count of logs
        const { count } = await supabase
          .from('metric_logs')
          .select('*', { count: 'exact', head: true })
          .eq('metric_template_id', metric.id);

        metricsWithStats.push({
          ...metric,
          latest_log: latestLog || undefined,
          trend: trendData,
          logs_count: count || 0
        });
      }

      setMetrics(metricsWithStats);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load metrics. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const filteredMetrics = metrics.filter(metric => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return metric.is_active;
    if (activeTab === 'inactive') return !metric.is_active;
    return true;
  });

  // Helper for finding improved metrics (decreasing for blood values, increasing for weight)
  const getImprovedMetrics = () => {
    return metrics.filter(m => {
      if (m.value_type === 'bloodpressure' || m.value_type === 'bloodsugar') {
        return m.trend === 'decrease';
      } else {
        // For metrics like weight, decrease is good
        return m.trend === 'decrease';
      }
    });
  };

  // Helper for finding metrics that need attention (increasing for blood values, decreasing for positive metrics)
  const getMetricsToFocusOn = () => {
    return metrics.filter(m => {
      if (m.value_type === 'bloodpressure' || m.value_type === 'bloodsugar') {
        return m.trend === 'increase';
      } else {
        // For metrics like weight, increase is concerning
        return m.trend === 'increase';
      }
    });
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>
          <p className="text-muted-foreground">Track and analyze your health metrics</p>
        </div>
        <Link href="/metrics/new">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Metric
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard 
          title="Total Metrics" 
          value={metrics.length.toString()} 
          icon={<Activity className="h-4 w-4 text-muted-foreground" />} 
        />
        <StatsCard 
          title="Measurements" 
          value={metrics.reduce((sum, metric) => sum + metric.logs_count, 0).toString()} 
          icon={<Thermometer className="h-4 w-4 text-blue-500" />} 
        />
        <StatsCard 
          title="Improved Metrics" 
          value={getImprovedMetrics().length.toString()} 
          icon={<Scale className="h-4 w-4 text-green-500" />} 
        />
        <StatsCard 
          title="Metrics to Focus On" 
          value={getMetricsToFocusOn().length.toString()} 
          icon={<LineChart className="h-4 w-4 text-orange-500" />} 
        />
      </div>

      <Tabs defaultValue="all" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all">All Metrics</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <p>Loading metrics...</p>
          ) : filteredMetrics.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold">No metrics found</h3>
              <p className="text-muted-foreground">Create your first metric to start tracking your health</p>
              <Link href="/metrics/new">
                <Button className="mt-4">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Metric
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMetrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatsCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ metric }: { metric: MetricWithStats }) {
  const getMetricValue = () => {
    if (!metric.latest_log) return 'No data';
    
    if (metric.value_type === 'number') {
      return `${metric.latest_log.value_numeric} ${metric.unit}`;
    } else if (metric.value_type === 'bloodpressure') {
      return `${metric.latest_log.value_systolic}/${metric.latest_log.value_diastolic} ${metric.unit}`;
    } else if (metric.value_type === 'bloodsugar') {
      return `${metric.latest_log.value_bloodsugar} ${metric.unit}`;
    }
    
    return 'No data';
  };

  const getMetricContext = () => {
    if (!metric.latest_log || !metric.latest_log.context) return null;
    return metric.latest_log.context;
  };

  const getTrendIcon = () => {
    const isBloodValue = metric.value_type === 'bloodpressure' || metric.value_type === 'bloodsugar';
    
    if (metric.trend === 'increase') {
      // For blood values, increase is typically bad
      return isBloodValue ? 
        <ChevronUp className="h-4 w-4 text-destructive" /> :
        <ChevronUp className="h-4 w-4 text-green-500" />;
    } else if (metric.trend === 'decrease') {
      // For blood values, decrease is typically good
      return isBloodValue ?
        <ChevronDown className="h-4 w-4 text-green-500" /> :
        <ChevronDown className="h-4 w-4 text-destructive" />;
    } else if (metric.trend === 'steady') {
      return <Minus className="h-4 w-4 text-yellow-500" />;
    }
    
    return null;
  };

  const getTrendText = () => {
    if (metric.trend === 'unknown' || !metric.latest_log) return null;
    
    const isBloodValue = metric.value_type === 'bloodpressure' || metric.value_type === 'bloodsugar';
    let trendClass = '';
    
    if (metric.trend === 'increase') {
      trendClass = isBloodValue ? 'text-destructive' : 'text-green-500';
    } else if (metric.trend === 'decrease') {
      trendClass = isBloodValue ? 'text-green-500' : 'text-destructive';
    } else if (metric.trend === 'steady') {
      trendClass = 'text-yellow-500';
    }
    
    return (
      <span className={trendClass}>
        {metric.trend.charAt(0).toUpperCase() + metric.trend.slice(1)}
      </span>
    );
  };

  const getMetricIcon = () => {
    if (metric.value_type === 'number') {
      return <Scale className="h-5 w-5" />;
    } else if (metric.value_type === 'bloodpressure') {
      return <Activity className="h-5 w-5" />;
    } else if (metric.value_type === 'bloodsugar') {
      return <Thermometer className="h-5 w-5" />;
    }
    
    return <LineChart className="h-5 w-5" />;
  };

  const getLastUpdated = () => {
    if (!metric.latest_log) return 'No entries yet';
    
    return `Last updated: ${format(new Date(metric.latest_log.measurement_date), 'MMM d, yyyy')}`;
  };

  return (
    <Link href={`/metrics/${metric.id}`}>
      <Card className="h-full hover:bg-muted/50 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              {getMetricIcon()}
              <CardTitle>{metric.name}</CardTitle>
            </div>
            {!metric.is_active && (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>
          <CardDescription>{metric.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">{getMetricValue()}</div>
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                {getTrendText()}
              </div>
            </div>
            
            {getMetricContext() && (
              <div className="text-sm text-muted-foreground">
                Context: {getMetricContext()}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              {getLastUpdated()}
            </div>
            
            {metric.normal_range_min && metric.normal_range_max && (
              <div className="text-xs text-muted-foreground">
                Normal range: {metric.normal_range_min} - {metric.normal_range_max} {metric.unit}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}