"use client";

import { useState } from "react";
import { authClient } from "~/server/better-auth/client";

export function SignInButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      className="flex items-center gap-2 rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20 disabled:opacity-60"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" });
      }}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
        </svg>
      )}
      {loading ? "Signing in…" : "Sign in with Github"}
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
      onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}
    >
      Sign out
    </button>
  );
}
