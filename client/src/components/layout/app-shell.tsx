import { useState, ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function AppShell({ 
  children,
  showSidebar = true
}: AppShellProps) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  if (!user) {
    return <>{children}</>;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header onToggleMobileMenu={toggleMobileMenu} />
      
      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - desktop always visible, mobile conditionally */}
        {showSidebar && (
          <>
            <Sidebar className="hidden md:block w-64" />
            {mobileMenuOpen && (
              <div className="fixed inset-0 z-40 md:hidden">
                <div 
                  className="fixed inset-0 bg-gray-600 bg-opacity-75"
                  onClick={toggleMobileMenu}
                ></div>
                <div className="relative flex flex-col bg-white w-full max-w-xs h-full">
                  <Sidebar className="w-full" />
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Main content */}
        <main className={cn(
          "flex-1 overflow-y-auto bg-gray-50",
          showSidebar ? "" : "w-full"
        )}>
          {children}
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
