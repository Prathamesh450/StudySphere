import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, User, Lock, Mail, Pencil } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    bio: user?.bio || "",
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PATCH", `/api/user/${user?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <Breadcrumb
            segments={[
              { name: "Home", href: "/" },
              { name: "Profile" },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your account and settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Profile sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarFallback className="text-xl font-medium">
                    {user?.displayName?.substring(0, 2) || user?.username.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{user?.displayName || user?.username}</h2>
                <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
                <div className="w-full mt-6 space-y-2">
                  <Button className="w-full" size="sm" variant="outline" asChild>
                    <a href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </a>
                  </Button>
                  <Button className="w-full" size="sm" variant="outline" asChild>
                    <a href="/settings">
                      <Lock className="mr-2 h-4 w-4" />
                      Security Settings
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="profile" className="space-y-4">
              <TabsList>
                <TabsTrigger value="profile">Profile Information</TabsTrigger>
                <TabsTrigger value="activity">Activity History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                        Update your personal details and public profile information
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(!isEditing)}
                      disabled={updateProfileMutation.isPending}
                    >
                      {isEditing ? "Cancel" : (
                        <>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          placeholder="Username"
                          value={user?.username}
                          disabled
                        />
                        <p className="text-sm text-gray-500">Username cannot be changed</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          name="displayName"
                          placeholder="Display Name"
                          value={formData.displayName}
                          onChange={handleInputChange}
                          disabled={!isEditing || updateProfileMutation.isPending}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Email Address"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={!isEditing || updateProfileMutation.isPending}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Input
                          id="bio"
                          name="bio"
                          placeholder="Tell others about yourself"
                          value={formData.bio}
                          onChange={handleInputChange}
                          disabled={!isEditing || updateProfileMutation.isPending}
                        />
                      </div>
                    </CardContent>
                    
                    {isEditing && (
                      <CardFooter>
                        <Button 
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : "Save Changes"}
                        </Button>
                      </CardFooter>
                    )}
                  </form>
                </Card>
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                    <CardDescription>
                      Your recent activities on the platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {user?.id ? (
                        <div className="space-y-4">
                          <div className="border-l-2 border-primary pl-4 pb-4 space-y-2">
                            <p className="text-sm text-gray-500">Today</p>
                            <div className="space-y-4">
                              <div>
                                <p className="font-medium">You joined StudySphere</p>
                                <p className="text-sm text-gray-500">Welcome to the community!</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-gray-500">No activity history available.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppShell>
  );
}