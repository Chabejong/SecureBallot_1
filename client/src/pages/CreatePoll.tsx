import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, X, Globe, Users, UserCheck, Calendar, Settings, Upload, Link, Trash2 } from "lucide-react";

const pollOptionSchema = z.object({
  text: z.string().min(1, "Option text is required").max(255, "Option text too long"),
  imageUrl: z.string().optional().or(z.literal("")).refine((val) => {
    if (!val) return true;
    return val.startsWith('data:') || /^https?:\/\/.+/.test(val);
  }, "Must be a valid URL or uploaded image"),
});

const createPollSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().optional(),
  pollType: z.enum(["public", "members", "invited"]).default("public"),
  isAnonymous: z.boolean().default(true),
  allowVoteChanges: z.boolean().default(true),
  isMultipleChoice: z.boolean().default(false),
  isPublicShareable: z.boolean().default(false),
  endDate: z.string().optional().refine((val) => val && val.length > 0, "End date is required"),
  options: z.array(pollOptionSchema).min(2, "At least 2 options required"),
});

type CreatePollForm = z.infer<typeof createPollSchema>;

export default function CreatePoll() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [options, setOptions] = useState<Array<{text: string, imageUrl: string, imageLoadError?: boolean}>>([
    {text: "", imageUrl: ""}, 
    {text: "", imageUrl: ""}
  ]);

  const form = useForm<CreatePollForm>({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      title: "",
      description: "",
      pollType: "public",
      isAnonymous: true,
      allowVoteChanges: true,
      isMultipleChoice: false,
      isPublicShareable: false,
      endDate: undefined,
      options: [{text: "", imageUrl: ""}, {text: "", imageUrl: ""}],
    },
  });

  const createPollMutation = useMutation({
    mutationFn: async (data: CreatePollForm) => {
      if (import.meta.env.DEV) {
        console.log('Making API request to create poll');
      }
      const response = await apiRequest("POST", "/api/polls", data);
      const pollData = await response.json();
      if (import.meta.env.DEV) {
        console.log('Poll created successfully:', pollData);
      }
      return pollData;
    },
    onSuccess: (pollData) => {
      if (import.meta.env.DEV) {
        console.log('onSuccess handler called with poll data:', pollData);
      }
      toast({
        title: "Success",
        description: "Poll created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/polls"] });
      
      // Redirect to confirmation page for public polls, otherwise poll details page
      const redirectPath = form.getValues().isPublicShareable 
        ? `/poll/${pollData.id}/confirmation`
        : `/poll/${pollData.id}`;
      setLocation(redirectPath);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create poll. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addOption = () => {
    setOptions([...options, {text: "", imageUrl: ""}]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      form.setValue("options", newOptions);
    }
  };

  const updateOption = (index: number, field: 'text' | 'imageUrl', value: string) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    // Reset image load error when URL changes
    if (field === 'imageUrl') {
      newOptions[index].imageLoadError = false;
    }
    setOptions(newOptions);
    form.setValue("options", newOptions);
  };

  // Handle image load error
  const handleImageError = (index: number) => {
    const newOptions = [...options];
    newOptions[index].imageLoadError = true;
    setOptions(newOptions);
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file upload
  const handleFileUpload = async (index: number, file: File) => {
    // File size limit: 500KB
    const MAX_FILE_SIZE = 500 * 1024;
    
    if (!file || !file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file.",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Error",
        description: "Image file size must be less than 500KB.",
        variant: "destructive",
      });
      return;
    }
    
    // Only allow common image types for security
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please use JPEG, PNG, GIF, or WebP image formats.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const base64 = await fileToBase64(file);
      updateOption(index, 'imageUrl', base64);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Clear image
  const clearImage = (index: number) => {
    updateOption(index, 'imageUrl', '');
  };

  // Set minimum date to current date
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const minDateTime = now.toISOString().slice(0, 16);
    const dateInput = document.getElementById("endDate") as HTMLInputElement;
    if (dateInput) {
      dateInput.min = minDateTime;
    }
  }, []);

  const onSubmit = (data: CreatePollForm) => {
    console.log('Form submission started with data:', data);
    
    const filteredOptions = data.options.filter(option => option.text.trim() !== "");
    console.log('Filtered options:', filteredOptions);
    
    if (filteredOptions.length < 2) {
      console.log('Validation failed: insufficient options');
      toast({
        title: "Error",
        description: "At least 2 options are required.",
        variant: "destructive",
      });
      return;
    }
    
    const submitData = {
      ...data,
      options: filteredOptions,
    };
    console.log('Submitting poll with data:', submitData);
    
    createPollMutation.mutate(submitData);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" data-testid="text-create-poll-title">
            Create a New Poll
          </h1>
          <p className="text-xl text-muted-foreground">
            Engage your community in democratic decision-making
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Poll Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Poll Type Selection */}
                <FormField
                  control={form.control}
                  name="pollType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poll Type</FormLabel>
                      <div className="grid md:grid-cols-3 gap-4">
                        {[
                          { value: "public", icon: Globe, label: "Public Poll", desc: "Open to everyone" },
                          { value: "members", icon: Users, label: "Members Only", desc: "Registered members" },
                          { value: "invited", icon: UserCheck, label: "Invited Only", desc: "Specific participants" }
                        ].map((type) => (
                          <div key={type.value} className="relative">
                            <input
                              type="radio"
                              id={type.value}
                              value={type.value}
                              checked={field.value === type.value}
                              onChange={() => field.onChange(type.value)}
                              className="peer sr-only"
                              data-testid={`radio-poll-type-${type.value}`}
                            />
                            <label
                              htmlFor={type.value}
                              className="flex flex-col items-center p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/30 peer-checked:border-primary peer-checked:bg-primary/5 transition-colors"
                            >
                              <type.icon className="w-6 h-6 text-primary mb-2" />
                              <span className="font-medium text-foreground">{type.label}</span>
                              <span className="text-xs text-muted-foreground text-center">{type.desc}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Poll Details */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poll Title <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter poll title..."
                          {...field}
                          data-testid="input-poll-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your poll question and provide context..."
                          rows={4}
                          {...field}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Poll Options */}
                <div>
                  <FormLabel className="text-base font-medium">Poll Options <span className="text-red-500">*</span></FormLabel>
                  <div className="space-y-4 mt-3">
                    {options.map((option, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-start space-x-3">
                          <Badge variant="outline" className="flex-shrink-0 w-8 h-8 flex items-center justify-center mt-1">
                            {index + 1}
                          </Badge>
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder={`Option ${index + 1} text...`}
                              value={option.text}
                              onChange={(e) => updateOption(index, 'text', e.target.value)}
                              data-testid={`input-option-text-${index}`}
                            />
                            
                            {/* Image upload section */}
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-muted-foreground">Image (optional)</div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <div className="flex-1">
                                  <Input
                                    placeholder="Image URL..."
                                    value={option.imageUrl && !option.imageUrl.startsWith('data:') ? option.imageUrl : ''}
                                    onChange={(e) => updateOption(index, 'imageUrl', e.target.value)}
                                    data-testid={`input-option-image-url-${index}`}
                                  />
                                </div>
                                <div className="flex-shrink-0">
                                  <div className="relative">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(index, file);
                                      }}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      data-testid={`input-option-file-${index}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="flex items-center gap-2 h-9 px-3"
                                    >
                                      <Upload className="w-4 h-4" />
                                      Upload
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Image preview and controls */}
                              {option.imageUrl && (
                                <div className="flex items-start gap-3">
                                  <div className="w-16 h-16 border rounded overflow-hidden flex-shrink-0">
                                    {option.imageLoadError ? (
                                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
                                        Failed to load
                                      </div>
                                    ) : (
                                      <img 
                                        src={option.imageUrl} 
                                        alt={`Option ${index + 1} preview`}
                                        className="w-full h-full object-cover"
                                        onError={() => handleImageError(index)}
                                        onLoad={() => {
                                          // Reset error state on successful load
                                          const newOptions = [...options];
                                          newOptions[index].imageLoadError = false;
                                          setOptions(newOptions);
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs text-muted-foreground truncate">
                                        {option.imageUrl.startsWith('data:') ? (
                                          <span>Uploaded image</span>
                                        ) : (
                                          <span className="truncate">{option.imageUrl}</span>
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => clearImage(index)}
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                        data-testid={`button-clear-image-${index}`}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          {options.length > 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeOption(index)}
                              data-testid={`button-remove-option-${index}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addOption}
                      className="flex items-center gap-2"
                      data-testid="button-add-option"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Option
                    </Button>
                  </div>
                </div>

                {/* Poll Settings */}
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          End Date & Time <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            id="endDate"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex flex-col justify-end space-y-4">
                    <FormField
                      control={form.control}
                      name="isAnonymous"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-anonymous"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Anonymous voting
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isMultipleChoice"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-multiple-choice"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Allow multiple selections
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    
                    <FormField
                      control={form.control}
                      name="allowVoteChanges"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-allow-vote-changes"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Allow voters to change their vote
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isPublicShareable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-public-shareable"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Public Poll (Anyone with link can vote)
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPollMutation.isPending}
                    className=""
                    data-testid="button-publish-poll"
                  >
                    {createPollMutation.isPending ? "Publishing..." : "Publish Poll"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
