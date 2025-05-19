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
import { CalendarIcon, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import * as React from 'react';

interface FormData {
  name: string;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'custom';
  frequency_days: number[];
  time_of_day: string;
  start_date: Date;
  is_active: boolean;
}

const categories = [
  'Health', 
  'Fitness', 
  'Productivity', 
  'Learning', 
  'Mindfulness', 
  'Relationships', 
  'Creativity', 
  'Personal Growth',
  'Finance',
  'Other'
];

const timesOfDay = [
  'Morning',
  'Afternoon',
  'Evening',
  'Anytime'
];

export default function EditHabitPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: '',
    frequency: 'daily',
    frequency_days: [],
    time_of_day: 'Anytime',
    start_date: new Date(),
    is_active: true,
  });

  useEffect(() => {
    const fetchHabit = async () => {
      try {
        setIsLoading(true);
        
        // Ensure user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('User not authenticated');
          toast({
            title: "Authentication Error",
            description: "You must be logged in to edit habits",
            variant: "destructive"
          });
          router.push('/login');
          return;
        }
        
        const { data: habit, error } = await supabase
          .from('habits')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        if (habit) {
          setFormData({
            name: habit.name,
            description: habit.description || '',
            category: habit.category || '',
            frequency: habit.frequency,
            frequency_days: habit.frequency_days || [],
            time_of_day: habit.time_of_day || 'Anytime',
            start_date: parseISO(habit.start_date),
            is_active: habit.is_active,
          });
        }
      } catch (error) {
        console.error('Error fetching habit:', error);
        toast({
          title: "Error",
          description: "Failed to load habit data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHabit();
  }, [id, router]);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFrequencyDays = (days: string[]) => {
    // Convert string values to numbers
    const numericDays = days.map(day => parseInt(day));
    handleChange('frequency_days', numericDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Habit name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Format the date for Supabase
      const formattedDate = format(formData.start_date, 'yyyy-MM-dd');
      
      // Update the habit
      const { error } = await supabase
        .from('habits')
        .update({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          frequency: formData.frequency,
          frequency_days: formData.frequency_days,
          time_of_day: formData.time_of_day,
          start_date: formattedDate,
          is_active: formData.is_active,
        })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Habit updated successfully!",
      });
      router.push(`/habits/${id}`);
    } catch (error: any) {
      console.error('Error updating habit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update habit",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Delete the habit
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Habit deleted successfully",
      });
      router.push('/habits');
    } catch (error: any) {
      console.error('Error deleting habit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete habit",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="container py-6">Loading habit data...</div>;
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center mb-8">
        <Link href={`/habits/${id}`} className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Habit</h1>
          <p className="text-muted-foreground">Update your habit details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Habit Details</CardTitle>
            <CardDescription>Edit the details of your habit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Habit Name *</Label>
              <Input 
                id="name" 
                placeholder="e.g., Morning Meditation" 
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Describe your habit and why it's important to you"
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
                <Label htmlFor="time-of-day">Time of Day</Label>
                <Select 
                  value={formData.time_of_day} 
                  onValueChange={(value) => handleChange('time_of_day', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time of day" />
                  </SelectTrigger>
                  <SelectContent>
                    {timesOfDay.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <Label>Frequency</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  type="button"
                  variant={formData.frequency === 'daily' ? 'default' : 'outline'}
                  onClick={() => handleChange('frequency', 'daily')}
                  className="justify-start"
                >
                  Daily
                </Button>
                <Button 
                  type="button"
                  variant={formData.frequency === 'weekly' ? 'default' : 'outline'}
                  onClick={() => handleChange('frequency', 'weekly')}
                  className="justify-start"
                >
                  Weekly
                </Button>
                <Button 
                  type="button"
                  variant={formData.frequency === 'custom' ? 'default' : 'outline'}
                  onClick={() => handleChange('frequency', 'custom')}
                  className="justify-start"
                >
                  Custom
                </Button>
              </div>
              
              {formData.frequency === 'custom' && (
                <div className="pt-4">
                  <Label className="mb-2 block">Choose Days</Label>
                  <ToggleGroup 
                    type="multiple" 
                    variant="outline"
                    className="justify-start"
                    value={formData.frequency_days.map(day => day.toString())}
                    onValueChange={handleFrequencyDays}
                  >
                    <ToggleGroupItem value="0" aria-label="Sunday">S</ToggleGroupItem>
                    <ToggleGroupItem value="1" aria-label="Monday">M</ToggleGroupItem>
                    <ToggleGroupItem value="2" aria-label="Tuesday">T</ToggleGroupItem>
                    <ToggleGroupItem value="3" aria-label="Wednesday">W</ToggleGroupItem>
                    <ToggleGroupItem value="4" aria-label="Thursday">T</ToggleGroupItem>
                    <ToggleGroupItem value="5" aria-label="Friday">F</ToggleGroupItem>
                    <ToggleGroupItem value="6" aria-label="Saturday">S</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? (
                      format(formData.start_date, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date}
                    onSelect={(date: Date | undefined) => date && handleChange('start_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button" disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete Habit'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the habit and all of its tracking history. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <div className="space-x-2">
              <Link href={`/habits/${id}`}>
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
} 