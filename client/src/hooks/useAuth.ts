import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Allow refetch on mount to pick up auth changes
    refetchOnReconnect: false,
  });

  if (import.meta.env.DEV) {
    console.log('useAuth hook - isLoading:', isLoading, 'user:', user, 'error:', error);
  }

  return {
    user: user as User | undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}
