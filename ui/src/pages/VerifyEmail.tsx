import { useEffect, useState } from "react";
import { useSearchParams, Link } from "@/lib/router";
import { authApi } from "../api/auth";
import { Sparkles, CheckCircle, XCircle } from "lucide-react";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const callbackURL = searchParams.get("callbackURL") ?? "/";
  const [state, setState] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("Missing verification token.");
      return;
    }
    authApi.verifyEmail(token, callbackURL)
      .then(() => setState("success"))
      .catch((err) => {
        setState("error");
        setError(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token, callbackURL]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-8 py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Doer</span>
        </div>

        {state === "verifying" && (
          <>
            <h1 className="text-xl font-semibold">Verifying your email…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Just a moment.</p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold">Email verified</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your email address has been confirmed.</p>
            <div className="mt-6">
              <Link
                to={callbackURL}
                className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Continue
              </Link>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-semibold">Verification failed</h1>
            <p className="mt-2 text-sm text-destructive">{error}</p>
            <div className="mt-5 text-sm text-muted-foreground">
              <Link to="/auth" className="font-medium text-foreground underline underline-offset-2">
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
