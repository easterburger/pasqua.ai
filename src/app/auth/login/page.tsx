
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasquaIcon } from "@/components/icons/PasquaIcon";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const { login, loading: authLoading, currentUser } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (currentUser) {
      router.push('/'); // Redirect if already logged in
    }
  }, [currentUser, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      // Basic validation, can be enhanced
      alert("Please enter both email and password.");
      return;
    }
    setIsSubmitting(true);
    await login(email, password);
    setIsSubmitting(false);
    // Navigation is handled within the login function on success/failure
  };
  
  if (authLoading && !currentUser) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  if(currentUser) return null; // Avoid rendering form if user object becomes available during render


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <PasquaIcon className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome Back!</CardTitle>
          <CardDescription>Sign in to continue to Pasqua AI Chat.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" className="w-full text-lg py-3" disabled={isSubmitting || authLoading}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
