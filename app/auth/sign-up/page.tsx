"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    setError(null);
    setHint(null);

    try {
      const supabase = createClient();
      const { error: signupErr } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (signupErr) {
        setError(signupErr.message);
        return;
      }

      setHint("Check your email to confirm — or disable confirmations in Supabase Auth settings for sandbox dev.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100vh] items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md rounded-2xl border-border/80 shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Create account</CardTitle>
          <CardDescription>Backed by Supabase Auth with email confirmation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-accent-energy" role="alert">
              {error}
            </p>
          ) : null}
          {hint ? (
            <p className="text-sm text-accent-success" role="status">
              {hint}
            </p>
          ) : null}
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Password
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <Button className="w-full rounded-xl" disabled={loading} type="button" onClick={() => void signUp()}>
            Sign up
          </Button>
        </CardContent>
        <CardFooter className="justify-between gap-3 text-xs text-muted-foreground">
          <Link href="/auth/login">Already have access? Sign in →</Link>
          <Link href="/">Landing</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
