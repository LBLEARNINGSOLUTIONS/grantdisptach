"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("dispatcher@example.com");
  const [password, setPassword] = useState("dispatch");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/",
    });
    if (result?.error) setError("Invalid login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand via-clay to-sand flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl bg-white/80 shadow-xl p-8 space-y-5"
      >
        <div>
          <h1 className="text-2xl font-semibold">Dispatch Daily Checklist</h1>
          <p className="text-sm text-neutral-600">
            Sign in to track driver touchpoints.
          </p>
        </div>
        <label className="block text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-ember">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-xl bg-ink text-sand py-2 text-sm font-semibold"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
