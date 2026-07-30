"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Stethoscope, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", { email, password, redirect: false });

    setLoading(false);
    if (result?.error) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-surface p-7"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-wash text-accent">
            <Stethoscope className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink-primary">Ingresar al panel</h1>
            <p className="text-sm text-ink-muted">Turnos, pacientes y profesionales en un solo lugar</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-secondary">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-page px-3 py-2 text-sm text-ink-primary outline-none ring-accent transition-shadow focus:ring-2"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-secondary">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-page px-3 py-2 text-sm text-ink-primary outline-none ring-accent transition-shadow focus:ring-2"
          />
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-status-critical">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
