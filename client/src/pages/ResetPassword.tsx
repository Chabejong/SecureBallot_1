import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { resetPasswordSchema, type ResetPassword } from "@shared/schema";
import { Eye, EyeOff, Key, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get token from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const form = useForm<ResetPassword>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onSubmit",
    defaultValues: {
      token: token || "",
      password: "",
    },
  });

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Invalid Reset Link",
        description: "The password reset link is invalid or missing.",
      });
      setLocation('/auth');
    }
  }, [token, setLocation, toast]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPassword) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }
      return response.json();
    },
    onSuccess: () => {
      setResetSuccess(true);
      toast({
        title: "Password Reset Successfully!",
        description: "You can now sign in with your new password.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message || "Failed to reset password",
      });
    },
  });

  const handleSubmit = (data: ResetPassword) => {
    resetPasswordMutation.mutate(data);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              The password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Link href="/forgot-password">
                <Button className="w-full" data-testid="button-request-new-reset">
                  Request New Reset Link
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Password Reset Successfully!</CardTitle>
            <CardDescription>
              Your password has been updated. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Link href="/auth">
                <Button className="w-full" data-testid="button-continue-to-login">
                  Continue to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below. Make sure it's strong and secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your new password"
                          data-testid="input-new-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={resetPasswordMutation.isPending}
                data-testid="button-reset-password"
              >
                {resetPasswordMutation.isPending ? (
                  "Resetting Password..."
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Reset Password
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center mt-6">
            <Link href="/auth">
              <Button variant="link" data-testid="button-back-to-login">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}