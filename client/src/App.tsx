import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import TestPage from "@/pages/test-page";
import HomePage from "@/pages/home-page";
import PapersPage from "@/pages/papers-page";
import DiscussionsPage from "@/pages/discussions-page";
import GroupsPage from "@/pages/groups-page";
import GroupDetailPage from "@/pages/group-detail-page";
import ProfilePage from "@/pages/profile-page";
import SettingsPage from "@/pages/settings-page";
import SessionsPage from "@/pages/sessions-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthRefresh } from "./components/auth-refresh";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <AuthProvider>
          <AuthRefresh />
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <Route path="/test" component={TestPage} />
            <ProtectedRoute path="/" component={HomePage} />
            <ProtectedRoute path="/papers" component={PapersPage} />
            <ProtectedRoute path="/discussions" component={DiscussionsPage} />
            <ProtectedRoute path="/groups" component={GroupsPage} />
            <ProtectedRoute path="/groups/:id" component={GroupDetailPage} />
            <Route path="/groups/new">
              {() => <Redirect to="/groups?create=true" />}
            </Route>
            <ProtectedRoute path="/profile" component={ProfilePage} />
            <ProtectedRoute path="/settings" component={SettingsPage} />
            <ProtectedRoute path="/sessions" component={SessionsPage} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </AuthProvider>
      </div>
    </QueryClientProvider>
  );
}

export default App;
