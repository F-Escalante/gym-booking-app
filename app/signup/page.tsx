"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const signup = async () => {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setMessage(
      data?.user
        ? "Registro realizado. Revisá tu email para confirmar la cuenta."
        : "Registro solicitado. Revisá tu email para completar el registro."
    );

    const next = searchParams.get("next");
    setTimeout(() => {
      router.push(next || "/login");
    }, 1400);
  };

  const sendMagicLink = async () => {
    setLoading(true);
    setMessage(null);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const redirectTo = `${appUrl}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    } as any);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setMessage("Te enviamos un link al email. Revisalo y abrilo para ingresar.");
  };

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Registro</h1>

      {message ? (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>
      ) : null}

      <input
        className="border p-2 w-full mb-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useMagicLink}
            onChange={(e) => setUseMagicLink(e.target.checked)}
          />
          <span className="text-sm">Usar link mágico (sin password)</span>
        </label>
      </div>

      {!useMagicLink && (
        <input
          type="password"
          className="border p-2 w-full mb-4"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}

      <button
        onClick={useMagicLink ? sendMagicLink : signup}
        disabled={loading}
        className={`bg-blue-600 text-white px-4 py-2 rounded ${
          loading ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {loading
          ? useMagicLink
            ? "Enviando link..."
            : "Registrando..."
          : useMagicLink
          ? "Enviar link mágico"
          : "Registrarse"}
      </button>

      <p className="mt-4 text-sm">
        Ya tenés cuenta? <a href="/login" className="text-blue-600">Ingresar</a>
      </p>
    </main>
  );
}
