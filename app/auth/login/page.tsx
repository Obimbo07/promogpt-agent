"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const continueEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextRaw = searchParams.get("next");
      const next =
        typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/dashboard";

      const supabase = createClient();

      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signErr) {
        setError(signErr.message);
        return;
      }

      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const oauth = async (provider: "google" | "github") => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthErr) {
        setError(oauthErr.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in could not start");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100vh] items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md rounded-2xl border-border/80 shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Sign in</CardTitle>
          <CardDescription>
            Uses Supabase Auth. Enable Email + OAuth providers in the Supabase dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-accent-energy" role="alert">
              {error}
            </p>
          ) : null}
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Password
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          <Button
            className="w-full rounded-xl"
            disabled={loading}
            type="button"
            onClick={() => void continueEmail()}
          >
            Continue with email
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              disabled={loading}
              type="button"
              onClick={() => void oauth("google")}
            >
              Google
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              disabled={loading}
              type="button"
              onClick={() => void oauth("github")}
            >
              GitHub
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-accent-secondary">
            ← Marketing site
          </Link>
          <Link href="/auth/sign-up" className="hover:text-accent-secondary">
            Create account →
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
