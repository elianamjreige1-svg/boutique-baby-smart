import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — cuddlekidslb" },
      { name: "description", content: "Administrator sign in for cuddlekidslb." },
      { property: "og:title", content: "Admin Login — cuddlekidslb" },
      { property: "og:description", content: "cuddlekidslb admin dashboard." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [canSignUp, setCanSignUp] = useState(false);
  const navigate = useNavigate();

  // Account creation is offered only while no admin account exists yet.
  useEffect(() => {
    let alive = true;
    supabase.rpc("has_admin").then(({ data }) => {
      if (alive) setCanSignUp(data === false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice("");

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) {
        navigate({ to: "/admin" });
        return;
      }
      setNotice("Check your email to confirm your account, then sign in here.");
      setMode("signin");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/admin" });
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="mb-6 text-3xl font-semibold">
        {mode === "signup" ? "Create admin account" : "Admin sign in"}
      </h1>

      {notice && (
        <p className="mb-4 rounded-2xl bg-muted px-4 py-3 text-sm">{notice}</p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Password</Label>
          <Input
            id="pw"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full rounded-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>

      {mode === "signin" && canSignUp && (
        <p className="mt-4 text-sm text-muted-foreground">
          No admin account yet?{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setMode("signup");
              setNotice("");
            }}
          >
            Create one
          </button>
        </p>
      )}

      {mode === "signup" && (
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setMode("signin");
              setNotice("");
            }}
          >
            Sign in
          </button>
        </p>
      )}
    </div>
  );
}
