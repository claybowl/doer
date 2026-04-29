export type AuthSession = {
  session: { id: string; userId: string };
  user: { id: string; email: string | null; name: string | null };
};

function toSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const sessionValue = record.session;
  const userValue = record.user;
  if (!sessionValue || typeof sessionValue !== "object") return null;
  if (!userValue || typeof userValue !== "object") return null;
  const session = sessionValue as Record<string, unknown>;
  const user = userValue as Record<string, unknown>;
  if (typeof session.id !== "string" || typeof session.userId !== "string") return null;
  if (typeof user.id !== "string") return null;
  return {
    session: { id: session.id, userId: session.userId },
    user: {
      id: user.id,
      email: typeof user.email === "string" ? user.email : null,
      name: typeof user.name === "string" ? user.name : null,
    },
  };
}

async function authPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (payload as { error?: { message?: string } | string } | null)?.error &&
      typeof (payload as { error?: { message?: string } | string }).error === "object"
        ? ((payload as { error?: { message?: string } }).error?.message ?? `Request failed: ${res.status}`)
        : (payload as { error?: string } | null)?.error ?? `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return payload;
}

export const authApi = {
  getSession: async (): Promise<AuthSession | null> => {
    const res = await fetch("/api/auth/get-session", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (res.status === 401) return null;
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(`Failed to load session (${res.status})`);
    }
    const direct = toSession(payload);
    if (direct) return direct;
    const nested = payload && typeof payload === "object" ? toSession((payload as Record<string, unknown>).data) : null;
    return nested;
  },

  signInEmail: async (input: { email: string; password: string }) => {
    await authPost("/sign-in/email", input);
  },

  signUpEmail: async (input: { name: string; email: string; password: string }) => {
    await authPost("/sign-up/email", input);
  },

  signOut: async () => {
    await authPost("/sign-out", {});
  },

  signInOAuth: (provider: "google" | "github", callbackURL?: string) => {
    const url = `/api/auth/sign-in/${provider}${callbackURL ? `?callbackURL=${encodeURIComponent(callbackURL)}` : ""}`;
    window.location.href = url;
  },

  forgotPassword: async (email: string) => {
    await authPost("/forget-password", {
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
  },

  resetPassword: async (token: string, newPassword: string) => {
    await authPost("/reset-password", { token, newPassword });
  },

  verifyEmail: async (token: string, callbackURL?: string) => {
    const params = new URLSearchParams({ token });
    if (callbackURL) params.set("callbackURL", callbackURL);
    const res = await fetch(`/api/auth/verify-email?${params}`, {
      credentials: "include",
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      const message = (payload as { message?: string } | null)?.message ?? `Verification failed (${res.status})`;
      throw new Error(message);
    }
  },
};
