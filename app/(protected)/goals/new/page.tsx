'use client';

import { useState, useEffect } from 'react';
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
import { CalendarIcon, ArrowLeft, Settings, X } from 'lucide-react'; // Removed Palette as it's not used directly
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

interface FormData {
  title: string;
  description: string;
  category: string;
  metric: string;
  target_value: number;
  target_date: Date;
  start_date: Date;
  is_active: boolean;
}

interface GoalCategory {
  id: string; 
  name: string;
  color: string;
  is_default: boolean; 
  user_id?: string; 
}

const initialGoalCategories: GoalCategory[] = [
  { id: 'default-health', name: 'Health', color: '#34d399', is_default: true },
  { id: 'default-fitness', name: 'Fitness', color: '#fbbf24', is_default: true },
  { id: 'default-career', name: 'Career', color: '#60a5fa', is_default: true },
  { id: 'default-education', name: 'Education', color: '#c084fc', is_default: true },
  { id: 'default-finance', name: 'Finance', color: '#ef4444', is_default: true },
  { id: 'default-personal', name: 'Personal', color: '#facc15', is_default: true },
  { id: 'default-family', name: 'Family', color: '#22d3ee', is_default: true },
  { id: 'default-social', name: 'Social', color: '#f472b6', is_default: true },
  { id: 'default-creativity', name: 'Creativity', color: '#a78bfa', is_default: true },
  { id: 'default-other', name: 'Other', color: '#94a3b8', is_default: true }
];

const predefinedColors: string[] = [
  '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#06B6D4',
  '#EF4444', '#F97316', '#84CC16', '#14B8A6', '#EC4899'
];

export default function NewGoalPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Initialize with initialGoalCategories
  const [categories, setCategories] = useState<GoalCategory[]>(initialGoalCategories);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>(predefinedColors[0]); // Use predefinedColors here
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: initialGoalCategories[0].name, // Default to the first initial category
    metric: '',
    target_value: 0,
    target_date: new Date(new Date().setMonth(new Date().getMonth() + 3)), // Default to 3 months from now
    start_date: new Date(),
    is_active: true,
  });

  // --- Fetch categories on component mount ---
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let userCreatedCategories: GoalCategory[] = [];

      if (user) {
        const { data, error } = await supabase
          .from('habit_categories') // Still using habit_categories table
          .select('*')
          .eq('user_id', user.id) // Fetch only categories belonging to the current user
          .order('name'); // Order by name for consistency

        if (error) {
          console.error("Error fetching user categories:", error.message);
          toast({
            title: "Error",
            description: "Failed to load your custom categories.",
            variant: "destructive"
          });
        } else if (data) {
          userCreatedCategories = data as GoalCategory[];
        }
      }

      // Merge initial categories with user-created categories
      const mergedCategoriesMap = new Map<string, GoalCategory>();

      // Add initial categories first
      initialGoalCategories.forEach(cat => mergedCategoriesMap.set(cat.name.toLowerCase(), cat));

      // Add user-created categories, overriding defaults if names clash
      userCreatedCategories.forEach(cat => mergedCategoriesMap.set(cat.name.toLowerCase(), cat));

      const finalCategories = Array.from(mergedCategoriesMap.values())
        .sort((a, b) => {
          // Keep defaults at the top, then sort alphabetically
          if (a.is_default && !b.is_default) return -1;
          if (!a.is_default && b.is_default) return 1;
          return a.name.localeCompare(b.name);
        });

      setCategories(finalCategories);

      // Set the default selected category if none is chosen or the current one isn't in the list
      if (!formData.category || !finalCategories.some(cat => cat.name === formData.category)) {
        if (finalCategories.length > 0) {
          setFormData(prev => ({ ...prev, category: finalCategories[0].name }));
        }
      }

    } catch (error) {
      console.error("Unexpected error in fetching categories:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading categories.",
        variant: "destructive"
      });
      // Fallback to only initial categories if a severe error occurs
      setCategories(initialGoalCategories);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []); // Empty dependency array means this runs once on mount

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddNewCategory = async () => {
    if (newCategoryName.trim() === '') {
      toast({
        title: "Error",
        description: "Category name cannot be empty.",
        variant: "destructive"
      });
      return;
    }
    // Check if category already exists (case-insensitive) among current list
    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      toast({
        title: "Error",
        description: `Category "${newCategoryName.trim()}" already exists.`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingCategory(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add categories.",
          variant: "destructive"
        });
        return;
      }

      const newCatNameTrimmed = newCategoryName.trim();
      const newCatData = {
        user_id: user.id,
        name: newCatNameTrimmed,
        color: newCategoryColor,
        is_default: false // User-created categories are always false for this property
      };

      const { data, error } = await supabase
        .from('habit_categories') // Insert into habit_categories table
        .insert([newCatData])
        .select(); // Select the inserted data to get the generated ID and other fields

      if (error) {
        if (error.code === '23505') { // Unique constraint violation on name
          throw new Error(`A category with the name "${newCatNameTrimmed}" already exists.`);
        }
        throw new Error(error.message || 'Failed to add new category');
      }

      const addedCategory = data[0] as GoalCategory; 
      // Update local state by re-fetching to ensure correct merging and sorting
      await fetchCategories();
      setNewCategoryName('');
      handleChange('category', addedCategory.name); 
      setNewCategoryColor(predefinedColors[0]); 
      toast({
        title: "Category Added",
        description: `New category "${addedCategory.name}" has been added.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "Error",
        description: "Default categories cannot be deleted.",
        variant: "destructive"
      });
      return;
    }

    // Confirm deletion for user-created categories
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('habit_categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        throw new Error(error.message || 'Failed to delete category');
      }

      toast({
        title: "Category Deleted",
        description: `Category "${categoryName}" has been deleted.`,
      });

      // If the deleted category was selected, reset the category in formData
      if (formData.category === categoryName) {
        // Set to the first available category, or empty if none left
        handleChange('category', categories.filter(cat => cat.name !== categoryName)[0]?.name || '');
      }
      
      // Re-fetch categories to update the list, ensuring consistency
      await fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category. Please try again.",
        variant: "destructive"
      });
    }
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

    // Ensure a category is selected if there are categories available
    if (categories.length > 0 && !formData.category) {
      toast({
        title: "Error",
        description: "Please select a category for your goal.",
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
      const formattedDeadline = format(formData.target_date, 'yyyy-MM-dd');
     
      // Insert the new goal
      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          category: formData.category || null, // Ensure category is set or null
          metric: formData.metric,
          target_value: formData.target_value,
          target_date: formattedDeadline,
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
      router.push('/goals'); // Redirect after successful creation
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
                <div className="flex items-center justify-between h-6">
                  <Label htmlFor="category">Category</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCategoryManagement(!showCategoryManagement)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value)}
                  disabled={loadingCategories}
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
                      <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Select a category"} />
                    )}
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" className="z-[101]">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
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
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/50 mt-2">
                    <div className="space-y-2">
                      <Label>Create New Category</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewCategory();
                            }
                          }}
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                            >
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: newCategoryColor }}
                              />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3 z-[101]">
                            <div className="grid grid-cols-5 gap-2">
                              {predefinedColors.map((color) => ( // Corrected to use predefinedColors
                                <button
                                  key={color}
                                  type="button"
                                  className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors duration-100"
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
                          onClick={handleAddNewCategory}
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
                        {/* Filter to show only user-created categories for deletion */}
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
                              onClick={() => handleDeleteCategory(category.id, category.name, category.is_default)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {categories.filter(cat => !cat.is_default).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No custom categories yet. Add one above!</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                  <PopoverContent className="w-auto p-0 z-[101]">
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
                      {formData.target_date ? format(formData.target_date, 'PPP') : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[101]">
                    <Calendar
                      mode="single"
                      selected={formData.target_date}
                      onSelect={(date) => date && handleChange('target_date', date)}
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