'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { CalendarIcon, PlusIcon, Settings, X, Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

interface HabitCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  is_default: boolean;
}

interface NewHabitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHabitCreated: (habit: any) => void;
}

const timesOfDay = [
  'Morning',
  'Afternoon',
  'Evening',
  'Anytime'
];

const predefinedColors = [
  '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#06B6D4', 
  '#EF4444', '#F97316', '#84CC16', '#14B8A6', '#EC4899'
];

export function NewHabitModal({ open, onOpenChange, onHabitCreated }: NewHabitModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(predefinedColors[0]);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  
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

  // Fetch user's categories
  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error } = await supabase
        .from('habit_categories')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        // Fallback to default categories
        const fallbackCategories = [
          { id: '1', name: 'Health', color: '#10B981', is_default: true },
          { id: '2', name: 'Fitness', color: '#F59E0B', is_default: true },
          { id: '3', name: 'Productivity', color: '#3B82F6', is_default: true },
          { id: '4', name: 'Other', color: '#6B7280', is_default: true },
        ];
        setCategories(fallbackCategories);
        return;
      }

      // Filter to only show the high-level categories we want
      const allowedDefaultCategories = ['Health', 'Fitness', 'Productivity', 'Other'];
      const filteredCategories = (categoriesData || []).filter(category => {
        // Always show user-created categories
        if (!category.is_default) return true;
        // Only show allowed default categories
        return allowedDefaultCategories.includes(category.name);
      });

      setCategories(filteredCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to default categories
      const fallbackCategories = [
        { id: '1', name: 'Health', color: '#10B981', is_default: true },
        { id: '2', name: 'Fitness', color: '#F59E0B', is_default: true },
        { id: '3', name: 'Productivity', color: '#3B82F6', is_default: true },
        { id: '4', name: 'Other', color: '#6B7280', is_default: true },
      ];
      setCategories(fallbackCategories);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFrequencyDays = (days: string[]) => {
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

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create habits");
      }

      const formattedDate = format(formData.start_date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          category: formData.category || null,
          frequency: formData.frequency,
          frequency_days: formData.frequency_days,
          time_of_day: formData.time_of_day || null,
          start_date: formattedDate,
          is_active: formData.is_active,
        })
        .select();

      if (error) {
        throw new Error(error.message || 'Failed to create habit');
      }
      
      toast({
        title: "Success",
        description: "Habit created successfully!",
      });

      if (data && data[0]) {
        onHabitCreated(data[0]);
      } else {
        onHabitCreated(null);
      }
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        category: '',
        frequency: 'daily',
        frequency_days: [],
        time_of_day: 'Anytime',
        start_date: new Date(),
        is_active: true,
      });
      
      setShowCategoryManager(false);
      onHabitCreated(data && data[0]);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create habit",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingCategory(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      const newCategoryNameTrimmed = newCategoryName.trim();

      const { error } = await supabase
        .from('habit_categories')
        .insert({
          user_id: user.id,
          name: newCategoryNameTrimmed,
          color: newCategoryColor,
          is_default: false
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error("A category with this name already exists");
        }
        throw error;
      }

      toast({
        title: "Success",
        description: "Category created successfully!",
      });

      // Automatically select the newly created category
      setFormData(prev => ({ ...prev, category: newCategoryNameTrimmed }));

      setNewCategoryName('');
      setNewCategoryColor(predefinedColors[0]);
      await fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive"
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('habit_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category deleted successfully!",
      });

      await fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Habit</DialogTitle>
          <DialogDescription>
            Create a new habit to track and improve your daily routine
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="flex items-center justify-between h-6">
                <Label htmlFor="category">Category</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Manage
                </Button>
              </div>
              
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent side="bottom" align="start" className="z-[101]">
                  {categories.map((category) => {
                    return (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {showCategoryManager && (
                <div className="space-y-3 p-3 border rounded-lg bg-muted/50 mt-2">
                  <div className="space-y-2">
                    <Label>Create New Category</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" type="button">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: newCategoryColor }}
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 z-[101]">
                          <div className="grid grid-cols-5 gap-2">
                            {predefinedColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-gray-400"
                                style={{ backgroundColor: color }}
                                onClick={() => setNewCategoryColor(color)}
                              />
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        size="sm"
                        onClick={createCategory}
                        disabled={isCreatingCategory}
                      >
                        {isCreatingCategory ? "Creating..." : "Add"}
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Your Categories</Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {categories.filter(cat => !cat.is_default).map((category) => (
                        <div key={category.id} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm">{category.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCategory(category.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center h-6">
                <Label htmlFor="time-of-day">Time of Day</Label>
              </div>
              <Select 
                value={formData.time_of_day} 
                onValueChange={(value) => handleChange('time_of_day', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time of day" />
                </SelectTrigger>
                <SelectContent side="bottom" align="start" className="z-[101]">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Habit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 