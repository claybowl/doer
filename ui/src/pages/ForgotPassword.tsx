import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { authApi } from "../api/auth";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim()),
    onSuccess: () => {
      setError(null);
      setSent(true);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Request failed");
    },
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-8 py-12">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Doer</span>
        </div>

        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we'll send you a reset link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-md border border-border bg-muted/30 p-4 text-sm">
            Check your inbox — a reset link is on its way to <strong>{email}</strong>.
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim() || mutation.isPending) return;
              mutation.mutate();
            }}
          >
            <div>
              <label htmlFor="email" className="text-xs text-muted-foreground mb-1 block">Email</label>
              <input
                id="email"
                type="email"
                autoFocus
                autoComplete="email"
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              type="submit"
              disabled={!email.trim() || mutation.isPending}
              className="w-full"
            >
              {mutation.isPending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <div className="mt-5 text-sm text-muted-foreground">
          <Link to="/auth" className="font-medium text-foreground underline underline-offset-2">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
