"use client";

import { useActionState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { signInAction, type LoginState } from "@/lib/actions/admin/auth";

const initialState: LoginState = { error: null };

export default function GirisPage() {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <form
          action={formAction}
          className="space-y-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h1 className="text-lg font-bold text-brand-950">Yönetim Girişi</h1>
            <p className="mt-1 text-sm text-brand-900/55">
              Devam etmek için giriş yapın.
            </p>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-semibold text-brand-900"
            >
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-semibold text-brand-900"
            >
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sun-500 py-2.5 font-bold text-white shadow-sm transition hover:bg-sun-600 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-brand-900/40"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogIn className="h-5 w-5" />
            )}
            {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
