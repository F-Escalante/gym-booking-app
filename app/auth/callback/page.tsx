"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Procesando...");
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const handle = async () => {
      try {
        // Prefer built-in helper if available
        if ((supabase.auth as any).getSessionFromUrl) {
          await (supabase.auth as any).getSessionFromUrl({ storeSession: true });
        } else {
          // Fallback: parse hash for access_token/refresh_token
          const hash = window.location.hash.replace(/^#/, "");
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        }

        if (!mounted) return;
        setMessage("Verificación completada. Redirigiendo...");

        // redirect to next param or home
        const nextParam = new URL(window.location.href).searchParams.get("next");
        const next = typeof nextParam === "string" ? nextParam : "/";
        setTimeout(() => router.replace(next), 800);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setMessage("No se pudo procesar el enlace de verificación.");
      }
    };

    handle();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Verificando cuenta</h1>
      <p>{message}</p>
    </main>
  );
}
