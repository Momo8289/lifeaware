'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  name: string;
  description: string;
  unit: string;
  value_type: 'number' | 'bloodpressure' | 'bloodsugar';
  normal_range_min: string;
  normal_range_max: string;
  target_min: string;
  target_max: string;
  is_active: boolean;
}

const valueTypes = [
  { id: 'number', name: 'Single Number (e.g. Weight)' },
  { id: 'bloodpressure', name: 'Blood Pressure (Systolic/Diastolic)' },
  { id: 'bloodsugar', name: 'Blood Sugar' }
];

const commonUnits = [
  { id: 'lbs', name: 'Pounds (lbs)' },
  { id: 'kg', name: 'Kilograms (kg)' },
  { id: 'mmHg', name: 'mmHg (Blood Pressure)' },
  { id: 'mg/dL', name: 'mg/dL (Blood Sugar)' },
  { id: 'mmol/L', name: 'mmol/L (Blood Sugar)' },
  { id: 'steps', name: 'Steps' },
  { id: 'minutes', name: 'Minutes' },
  { id: 'hours', name: 'Hours' },
  { id: '%', name: 'Percentage (%)' }
];

export default function NewMetricPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    unit: '',
    value_type: 'number',
    normal_range_min: '',
    normal_range_max: '',
    target_min: '',
    target_max: '',
    is_active: true,
  });

  const handleValueTypeChange = (type: 'number' | 'bloodpressure' | 'bloodsugar') => {
    handleChange('value_type' , type);

  //data for optional normal range section based on value_type selection
   switch(type){
    case('number'):
      
      handleChange('normal_range_min', '50');
      handleChange('normal_range_max', '100');
      break;
    
    case('bloodpressure'):

      handleChange('normal_range_min', '90');
      handleChange('normal_range_max', '120');
      break;
    
    case('bloodsugar'):

      handleChange('normal_range_min', '70');
      handleChange('normal_range_max', '130');
      break;
    
   }
  }
  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Metric name is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.unit) {
      toast({
        title: "Error",
        description: "Unit is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create metrics");
      }
      
      // Prepare numeric values
      const normal_range_min = formData.normal_range_min ? parseFloat(formData.normal_range_min) : null;
      const normal_range_max = formData.normal_range_max ? parseFloat(formData.normal_range_max) : null;
      const target_min = formData.target_min ? parseFloat(formData.target_min) : null;
      const target_max = formData.target_max ? parseFloat(formData.target_max) : null;
      
      // Insert the new metric template
      const { data, error } = await supabase
        .from('metric_templates')
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          unit: formData.unit,
          value_type: formData.value_type,
          base_min: normal_range_min,
          base_max: normal_range_max,
          target_min,
          target_max,
          is_active: formData.is_active,
        })
        .select();

      if (error) {
        // Silent error handling for production
        throw new Error(error.message || 'Failed to create metric');
      }
      
      toast({
        title: "Success",
        description: "Metric created successfully!",
      });
      router.push('/metrics');
    } catch (error: any) {
      // Silent error handling for production
      console.error(error)
      toast({
        title: "Error",
        description: typeof error === 'object' && error.message 
          ? error.message 
          : "Failed to create metric. Please check your inputs and try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center mb-8">
        <Link href="/metrics" className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Metric</h1>
          <p className="text-muted-foreground">Set up a new health metric to track</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Metric Details</CardTitle>
            <CardDescription>Enter the details of your new health metric</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Metric Name *</Label>
              <Input 
                id="name" 
                placeholder="e.g., Weight, Blood Pressure, Blood Sugar" 
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Why you're tracking this metric and what's your goal"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="value-type">Value Type *</Label>
                <Select 
                  value={formData.value_type} 
                  onValueChange={(value) => handleValueTypeChange(value as FormData['value_type'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select value type" />
                  </SelectTrigger>
                  <SelectContent>
                    {valueTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(value) => handleChange('unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {formData.unit === 'custom' && (
                  <Input 
                    className="mt-2"
                    placeholder="Enter custom unit"
                    onChange={(e) => handleChange('unit', e.target.value)}
                  />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Normal Range (Optional)</Label>
              
                {formData.value_type=== "number" && ( 
                <p className="text-sm text-muted-foreground mb-2">Tracks a single numeric value (e.g., weight, steps).</p>
                )}
               {formData.value_type=== "bloodpressure" && ( 
                <p className="text-sm text-muted-foreground mb-2">Tracks systolic and diastolic blood pressure readings.</p>
                )}
                 {formData.value_type=== "bloodsugar" && ( 
                <p className="text-sm text-muted-foreground mb-2">Tracks blood sugar levels (e.g., mg/dL or mmol/L).</p>
                )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="normal-min" className="sr-only">Minimum normal value</Label>
                  <Input 
                    id="normal-min" 
                    placeholder="Minimum" 
                    type="number"
                    step="0.01"
                    value={formData.normal_range_min}
                    onChange={(e) => handleChange('normal_range_min', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="normal-max" className="sr-only">Maximum normal value</Label>
                  <Input 
                    id="normal-max" 
                    placeholder="Maximum" 
                    type="number"
                    step="0.01"
                    value={formData.normal_range_max}
                    onChange={(e) => handleChange('normal_range_max', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Target Range (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Set your personal target range for this metric
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target-min" className="sr-only">Minimum target value</Label>
                  <Input 
                    id="target-min" 
                    placeholder="Minimum" 
                    type="number"
                    step="0.01"
                    value={formData.target_min}
                    onChange={(e) => handleChange('target_min', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="target-max" className="sr-only">Maximum target value</Label>
                  <Input 
                    id="target-max" 
                    placeholder="Maximum" 
                    type="number"
                    step="0.01"
                    value={formData.target_max}
                    onChange={(e) => handleChange('target_max', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="is-active" 
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange('is_active', checked)}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/metrics">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Metric'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 