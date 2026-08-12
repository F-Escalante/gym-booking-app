"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user?.email ?? null);
    });

    // Expose supabase client for short-term debugging in the browser console
    try {
      (window as any).supabase = supabase;
    } catch (e) {
      /* ignore in non-browser environments */
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      try {
        delete (window as any).supabase;
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    router.push("/");
  };

  return (
    <header className="w-full border-b p-4 mb-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <nav className="flex gap-4">
          <Link href="/classes">Clases</Link>
          <Link href="/reservations">Mis Reservas</Link>
          <Link href="/me">Mi Perfil</Link>
          <Link href="/admin">Admin</Link>
        </nav>

        <div className="flex items-center gap-4">
          {email ? (
            <>
              <span className="text-sm">{email}</span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link href="/signup">Registrarse</Link>
              <Link href="/login">Ingresar</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
