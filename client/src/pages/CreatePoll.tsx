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
import { Plus, X, Globe, Users, UserCheck, Calendar, Settings } from "lucide-react";

const createPollSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().optional(),
  category: z.string().optional(),
  pollType: z.enum(["public", "members", "invited"]).default("public"),
  isAnonymous: z.boolean().default(true),
  allowComments: z.boolean().default(false),
  allowVoteChanges: z.boolean().default(true),
  endDate: z.string().min(1, "End date is required"),
  options: z.array(z.string().min(1, "Option cannot be empty")).min(2, "At least 2 options required"),
});

type CreatePollForm = z.infer<typeof createPollSchema>;

export default function CreatePoll() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [options, setOptions] = useState<string[]>(["", ""]);

  const form = useForm<CreatePollForm>({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      pollType: "public",
      isAnonymous: true,
      allowComments: false,
      allowVoteChanges: true,
      endDate: "",
      options: ["", ""],
    },
  });

  const createPollMutation = useMutation({
    mutationFn: async (data: CreatePollForm) => {
      return await apiRequest("POST", "/api/polls", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Poll created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/polls"] });
      setLocation("/");
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
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      form.setValue("options", newOptions);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    form.setValue("options", newOptions);
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
    const filteredOptions = data.options.filter(option => option.trim() !== "");
    if (filteredOptions.length < 2) {
      toast({
        title: "Error",
        description: "At least 2 options are required.",
        variant: "destructive",
      });
      return;
    }
    
    createPollMutation.mutate({
      ...data,
      options: filteredOptions,
    });
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
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poll Title</FormLabel>
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="community">Community</SelectItem>
                            <SelectItem value="government">Government</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="environment">Environment</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                  <FormLabel className="text-base font-medium">Poll Options</FormLabel>
                  <div className="space-y-3 mt-3">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Badge variant="outline" className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <Input
                          placeholder={`Option ${index + 1}...`}
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          data-testid={`input-option-${index}`}
                        />
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
                          End Date & Time
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            id="endDate"
                            {...field}
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
                      name="allowComments"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-allow-comments"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Allow comments
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
