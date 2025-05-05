import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      institution: "",
      yearOfStudy: undefined,
    },
  });

  const onLoginSubmit = async (values: LoginValues) => {
    try {
      // Wait for login to complete
      await loginMutation.mutateAsync(values);
      
      // Force navigation to home page directly
      console.log("Login successful, redirecting to home");
      window.location.href = "/"; // Use direct navigation instead of wouter's setLocation
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const onRegisterSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      // Remove confirmPassword field as it's not in the insertUserSchema
      const { confirmPassword, ...userData } = values;
      
      // Wait for registration to complete
      await registerMutation.mutateAsync(userData as InsertUser);
      
      // Force navigation to home page directly
      console.log("Registration successful, redirecting to home");
      window.location.href = "/"; // Use direct navigation instead of wouter's setLocation
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  // Simplify the useEffect for redirection
  useEffect(() => {
    if (user) {
      console.log("User already logged in, redirecting to home");
      window.location.href = "/"; // Use direct navigation instead of wouter's setLocation
    }
  }, [user]);

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">
        {/* Auth Forms */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription>
                      Sign in to your StudySphere account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...loginForm}>
                      <form
                        onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username or Email</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your username or email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Enter your password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </Button>

                        <div className="mt-4 text-center">
                          <p className="text-sm text-muted-foreground">
                            Having trouble logging in? Try our simplified login:
                          </p>
                          <div className="mt-2">
                            <Link to="/direct-login" className="text-sm text-primary hover:underline">
                              Direct Login
                            </Link>
                            {" | "}
                            <Link to="/direct-register" className="text-sm text-primary hover:underline">
                              Direct Registration
                            </Link>
                          </div>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                  <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <Button
                        variant="link"
                        className="p-0"
                        onClick={() => setActiveTab("register")}
                      >
                        Register now
                      </Button>
                    </p>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Create an account</CardTitle>
                    <CardDescription>
                      Join StudySphere to collaborate with fellow students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...registerForm}>
                      <form
                        onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter a username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="displayName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="Enter your email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="institution"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Institution</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your institution" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="yearOfStudy"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Year of Study</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="1"
                                    min={1}
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      const value = e.target.value === "" 
                                        ? undefined 
                                        : parseInt(e.target.value);
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Create a password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Confirm your password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating account...
                            </>
                          ) : (
                            "Create Account"
                          )}
                        </Button>

                        <div className="mt-4 text-center">
                          <p className="text-sm text-muted-foreground">
                            Having trouble registering? Try our simplified registration:
                          </p>
                          <div className="mt-2">
                            <Link to="/direct-login" className="text-sm text-primary hover:underline">
                              Direct Login
                            </Link>
                            {" | "}
                            <Link to="/direct-register" className="text-sm text-primary hover:underline">
                              Direct Registration
                            </Link>
                          </div>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                  <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Button
                        variant="link"
                        className="p-0"
                        onClick={() => setActiveTab("login")}
                      >
                        Sign in
                      </Button>
                    </p>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Hero Section */}
        <div className="hidden md:flex flex-col justify-center">
          <div className="space-y-4">
            <div className="inline-block p-1 px-2 bg-primary-50 rounded-lg mb-2">
              <span className="text-primary-700 text-sm font-medium">
                Collaborative Learning Platform
              </span>
            </div>
            <h1 className="text-4xl font-bold">
              Enhance your academic journey with StudySphere
            </h1>
            <p className="text-gray-600 text-lg">
              Access past papers, engage in academic discussions, share study resources, 
              and collaborate with peers in study groups.
            </p>
            <div className="pt-4 space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary-100 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-primary-700 text-xs">✓</span>
                </div>
                <p className="text-gray-600">Access a comprehensive repository of past exam papers</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary-100 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-primary-700 text-xs">✓</span>
                </div>
                <p className="text-gray-600">Participate in academic discussions and get answers</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary-100 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-primary-700 text-xs">✓</span>
                </div>
                <p className="text-gray-600">Share and discover valuable study resources and notes</p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary-100 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-primary-700 text-xs">✓</span>
                </div>
                <p className="text-gray-600">Create or join study groups to collaborate with peers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
