import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function useAuthCheck() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [isAuthValid, setIsAuthValid] = useState(!!user);

  // Function to verify authentication status directly with the server
  const checkAuthentication = async (): Promise<boolean> => {
    setIsAuthChecking(true);
    
    try {
      // Make a direct request to the auth status endpoint
      const response = await fetch("/api/user", {
        credentials: "include"
      });
      
      // Check if response indicates authenticated
      const isAuthenticated = response.ok;
      setIsAuthValid(isAuthenticated);
      
      if (!isAuthenticated && user) {
        // We have a user object but server says not authenticated
        console.error("Authentication mismatch: client thinks user is logged in but server disagrees");
        // Invalidate the cached user data
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        toast({
          title: "Authentication error",
          description: "Your session may have expired. Please log in again.",
          variant: "destructive"
        });
      }
      
      return isAuthenticated;
      
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsAuthValid(false);
      return false;
    } finally {
      setIsAuthChecking(false);
    }
  };
  
  // Verify authentication on component mount
  useEffect(() => {
    checkAuthentication();
  }, []);
  
  return {
    isAuthChecking,
    isAuthValid,
    checkAuthentication
  };
}

export function AuthRefresh() {
  const { isAuthChecking, isAuthValid } = useAuthCheck();
  
  // This component doesn't render anything visible
  return null;
} 