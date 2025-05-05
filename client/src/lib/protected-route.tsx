import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useAuthCheck } from "@/components/auth-refresh";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType;
}) {
  const { user, isLoading } = useAuth();
  const { isAuthChecking, isAuthValid, checkAuthentication } = useAuthCheck();
  const [, navigate] = useLocation();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // First check if we have a user in context
    if (!isLoading) {
      if (!user) {
        // No user in context, navigate to auth page
        console.log("No user found, redirecting to login");
        navigate("/auth");
        return;
      }

      // We have a user, let's verify with the server
      const verifyAuth = async () => {
        const isValid = await checkAuthentication();
        
        if (!isValid) {
          // Server says we're not authenticated, go to login
          console.log("Server rejected authentication, redirecting to login");
          navigate("/auth");
          return;
        }
        
        // Authentication is valid
        setIsVerified(true);
      };
      
      verifyAuth();
    }
  }, [isLoading, user, navigate, checkAuthentication]);

  return (
    <Route path={path}>
      {() => {
        // Show loading spinner while loading auth state or verifying
        if (isLoading || isAuthChecking || (!isVerified && user)) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        // If no user or server says not authenticated, return null (will redirect in effect)
        if (!user || !isAuthValid) {
          return null;
        }

        // User is authenticated and verified, render the component
        return <Component />;
      }}
    </Route>
  );
}
