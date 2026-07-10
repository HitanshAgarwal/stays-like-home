"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthShell, Field, SubmitButton } from "../login/page";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Join Stays Like Home to book and host stays">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" type="text" value={name} onChange={setName} autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <p className="text-xs text-ink-faint">At least 8 characters.</p>
        {error && <p className="text-sm text-accent">{error}</p>}
        <SubmitButton submitting={submitting}>Sign up</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
