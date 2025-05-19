'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';

interface FormData {
  title: string;
  description: string;
  category: string;
  metric: string;
  target_value: number;
  deadline: Date;
  is_active: boolean;
  is_completed: boolean;
}

const categories = [
  'Health', 
  'Fitness', 
  'Career', 
  'Education', 
  'Finance', 
  'Personal',
  'Family',
  'Social',
  'Creativity',
  'Other'
];

export default function EditGoalPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    metric: '',
    target_value: 0,
    deadline: new Date(),
    is_active: true,
    is_completed: false,
  });

  useEffect(() => {
    const fetchGoal = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;

        if (!data) {
          toast({
            title: "Error",
            description: "Goal not found",
            variant: "destructive"
          });
          router.push('/goals');
          return;
        }

        setFormData({
          title: data.title,
          description: data.description || '',
          category: data.category || '',
          metric: data.metric,
          target_value: data.target_value,
          deadline: parseISO(data.deadline),
          is_active: data.is_active,
          is_completed: data.is_completed,
        });
      } catch (error) {
        console.error('Error fetching goal:', error);
        toast({
          title: "Error",
          description: "Failed to load goal details",
          variant: "destructive"
        });
        router.push('/goals');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoal();
  }, [params.id, router]);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast({
        title: "Error",
        description: "Goal title is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.metric) {
      toast({
        title: "Error",
        description: "Metric is required to measure your goal",
        variant: "destructive"
      });
      return;
    }

    if (formData.target_value <= 0) {
      toast({
        title: "Error",
        description: "Target value must be greater than zero",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Format the date for Supabase
      const formattedDeadline = format(formData.deadline, 'yyyy-MM-dd');
      
      // Update the goal
      const { error } = await supabase
        .from('goals')
        .update({
          title: formData.title,
          description: formData.description || null,
          category: formData.category || null,
          metric: formData.metric,
          target_value: formData.target_value,
          deadline: formattedDeadline,
          is_active: formData.is_active,
          is_completed: formData.is_completed,
        })
        .eq('id', params.id);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Failed to update goal');
      }
      
      toast({
        title: "Success",
        description: "Goal updated successfully!",
      });
      router.push(`/goals/${params.id}`);
    } catch (error: any) {
      console.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: typeof error === 'object' && error.message 
          ? error.message 
          : "Failed to update goal. Please check your inputs and try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <p>Loading goal details...</p>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center mb-8">
        <Link href={`/goals/${params.id}`} className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Goal</h1>
          <p className="text-muted-foreground">Update your goal details and progress</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Goal Details</CardTitle>
            <CardDescription>Modify your goal settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Goal Title *</Label>
              <Input 
                id="title" 
                placeholder="e.g., Lose 10 pounds, Save $5000" 
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Describe your goal and why it's important to you"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="metric">Metric (Unit of Measurement) *</Label>
                <Input 
                  id="metric" 
                  placeholder="e.g., pounds, dollars, pages"
                  value={formData.metric}
                  onChange={(e) => handleChange('metric', e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-value">Target Value *</Label>
              <Input 
                id="target-value" 
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 10, 5000, 200"
                value={formData.target_value.toString()}
                onChange={(e) => handleChange('target_value', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="deadline"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deadline ? format(formData.deadline, 'PPP') : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.deadline}
                    onSelect={(date) => date && handleChange('deadline', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="is-active">Active</Label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="is-active" 
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleChange('is_active', checked)}
                  />
                  <Label htmlFor="is-active" className="font-normal">
                    {formData.is_active ? "Active" : "Inactive"}
                  </Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="is-completed">Completed</Label>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="is-completed" 
                    checked={formData.is_completed}
                    onCheckedChange={(checked) => handleChange('is_completed', checked)}
                  />
                  <Label htmlFor="is-completed" className="font-normal">
                    {formData.is_completed ? "Completed" : "Not Completed"}
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => router.push(`/goals/${params.id}`)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 