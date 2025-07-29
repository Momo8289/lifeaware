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
import { CalendarIcon, ArrowLeft, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';

interface FormData {
  title: string;
  description: string;
  category: string; // Still a string for the selected category name
  metric: string;
  target_value: number;
  deadline: Date;
  start_date: Date;
  is_active: boolean;
}

interface GoalCategory {
  name: string;
  color: string;
}

const initialCategories: GoalCategory[] = [
  { name: 'Health', color: '#34d399' }, // Emerald-400
  { name: 'Fitness', color: '#fbbf24' }, // Amber-400
  { name: 'Career', color: '#60a5fa' },   // Blue-400
  { name: 'Education', color: '#c084fc' }, // Purple-400
  { name: 'Finance', color: '#ef4444' },   // Red-500
  { name: 'Personal', color: '#facc15' },  // Yellow-400
  { name: 'Family', color: '#22d3ee' },    // Cyan-400
  { name: 'Social', color: '#f472b6' },    // Pink-400
  { name: 'Creativity', color: '#a78bfa' }, // Indigo-400
  { name: 'Other', color: '#94a3b8' }      // Slate-400
];

const categoryColors: string[] = [
  '#34d399', // Green
  '#fbbf24', // Orange
  '#60a5fa', // Blue
  '#c084fc', // Purple
  '#ef4444', // Red
  '#facc15', // Yellow
  '#22d3ee', // Cyan
  '#f472b6', // Pink
  '#a78bfa', // Indigo
  '#94a3b8', // Gray
];

export default function NewGoalPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categories, setCategories] = useState<GoalCategory[]>(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>(categoryColors[0]); // Default to the first color

  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    metric: '',
    target_value: 0,
    deadline: new Date(new Date().setMonth(new Date().getMonth() + 3)),
    start_date: new Date(),
    is_active: true,
  });

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddNewCategory = () => {
    if (newCategoryName.trim() === '') {
      toast({
        title: "Error",
        description: "Category name cannot be empty.",
        variant: "destructive"
      });
      return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) { // Case-insensitive check
      toast({
        title: "Error",
        description: `Category "${newCategoryName.trim()}" already exists.`,
        variant: "destructive"
      });
      return;
    }

    const newCat: GoalCategory = { name: newCategoryName.trim(), color: newCategoryColor };
    const updatedCategories = [...categories, newCat];
    setCategories(updatedCategories);
    setNewCategoryName(''); 
    
    handleChange('category', newCat.name); // Automatically select the new category

    toast({
      title: "Category Added",
      description: `New category "${newCat.name}" has been added.`,
    });

    
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

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to create goals");
      }

      const formattedStartDate = format(formData.start_date, 'yyyy-MM-dd');
      const formattedDeadline = format(formData.deadline, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          category: formData.category || null,
          metric: formData.metric,
          target_value: formData.target_value,
          deadline: formattedDeadline,
          start_date: formattedStartDate,
          is_active: formData.is_active,
          current_value: 0,
          is_completed: false,
        })
        .select();

      if (error) {
        throw new Error(error.message || 'Failed to create goal');
      }

      toast({
        title: "Success",
        description: "Goal created successfully!",
      });
      router.push('/goals');
    } catch (error: any) {
      toast({
        title: "Error",
        description: typeof error === 'object' && error.message
          ? error.message
          : "Failed to create goal. Please check your inputs and try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center mb-8">
        <Link href="/goals" className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Goal</h1>
          <p className="text-muted-foreground">Set a SMART goal to track progress towards your objectives</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Goal Details</CardTitle>
            <CardDescription>Define a specific, measurable goal with a deadline</CardDescription>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="category">Category</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-auto p-0"
                    onClick={() => setShowCategoryManagement(!showCategoryManagement)}
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Manage Categories</span>
                  </Button>
                </div>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value)}
                >
                  <SelectTrigger>
                    {formData.category ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: categories.find(cat => cat.name === formData.category)?.color || '#94a3b8' }}
                        ></div>
                        <SelectValue>{formData.category}</SelectValue>
                      </div>
                    ) : (
                      <SelectValue placeholder="Select a category" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Conditional Rendering for Category Management Section */}
                {showCategoryManagement && (
                  <div className="pt-4 space-y-2"> {/* Removed extra div for "Your Categories" */}
                    <h3 className="text-sm font-medium">Create New Category</h3>
                    <div className="flex space-x-2 items-center">
                      <Input
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewCategory();
                          }
                        }}
                      />
                      {/* Color Picker Popover */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-md border shrink-0"
                            style={{ backgroundColor: newCategoryColor }}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2">
                          <div className="grid grid-cols-4 gap-2">
                            {categoryColors.map((color) => (
                              <div
                                key={color}
                                className="w-8 h-8 rounded-full cursor-pointer border border-transparent hover:border-foreground transition-colors duration-100"
                                style={{ backgroundColor: color }}
                                onClick={() => setNewCategoryColor(color)}
                              />
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button type="button" onClick={handleAddNewCategory}>Add</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Switch Section */}
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
            </div>

            {/* Rest of your form fields */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? format(formData.start_date, 'PPP') : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => date && handleChange('start_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
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
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/goals')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Goal"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}