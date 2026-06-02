import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams, Link } from "@/lib/router";
import { authApi } from "../api/auth";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("Missing reset token. Please request a new link.");
  }, [token]);

   const mutation = useMutation({
     mutationFn: () => authApi.resetPassword(token, password),
     onSuccess: () => {
       navigate("/auth", { replace: true });
     },
     onError: (err) => {
       // Generic error message to avoid leaking sensitive information
       setError("Password reset failed. Please check your token and try again.");
     },
   });

  const canSubmit = token.length > 0 && password.length >= 8 && password === confirm;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-8 py-12">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Doer</span>
        </div>

        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit || mutation.isPending) return;
            if (password !== confirm) {
              setError("Passwords do not match.");
              return;
            }
            setError(null);
            mutation.mutate();
          }}
        >
          <div>
            <label htmlFor="password" className="text-xs text-muted-foreground mb-1 block">New password</label>
            <input
              id="password"
              type="password"
              autoFocus
              autoComplete="new-password"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirm" className="text-xs text-muted-foreground mb-1 block">Confirm password</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {password.length > 0 && password.length < 8 && (
            <p className="text-xs text-muted-foreground">Password must be at least 8 characters.</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={!canSubmit || mutation.isPending}
            className={`w-full ${!canSubmit && !mutation.isPending ? "opacity-50" : ""}`}
          >
            {mutation.isPending ? "Saving…" : "Set new password"}
          </Button>
        </form>

        <div className="mt-5 text-sm text-muted-foreground">
          <Link to="/auth" className="font-medium text-foreground underline underline-offset-2">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
