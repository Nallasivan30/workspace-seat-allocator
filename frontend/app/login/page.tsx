"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, ArrowRight, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { loginSchema } from "@/lib/zod-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, error, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setSubmitting(true);
      await login(data);
    } catch (err) {
      console.error("Login component error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      {/* Background decorative gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[40%] left-[20%] w-[80%] h-[80%] rounded-full bg-indigo-200/20 blur-[120px] dark:bg-indigo-950/20" />
        <div className="absolute -bottom-[40%] right-[20%] w-[80%] h-[80%] rounded-full bg-violet-200/20 blur-[120px] dark:bg-violet-950/20" />
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="flex flex-col items-center justify-center gap-2 mb-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Ethara Workspace
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Log in to manage seats, employees, and team allocations
          </p>
        </div>

        <Card className="border-zinc-200/80 shadow-xl bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access the console</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-950 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ethara.dev"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full flex justify-center items-center gap-2 mt-2" disabled={submitting || isLoading}>
                {submitting ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 justify-center border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Demo Credentials:
            </span>
            <div className="flex flex-col gap-1 items-center text-xs text-zinc-600 dark:text-zinc-300">
              <p>Admin: <span className="font-semibold">admin@ethara.dev</span> / <span className="font-semibold">password</span></p>
              <p>Viewer: <span className="font-semibold">viewer@ethara.dev</span> / <span className="font-semibold">password</span></p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
