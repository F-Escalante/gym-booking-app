"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const updateUserState = async (session: { user: { id: string; email?: string | null } } | null) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);

      if (!session?.user) {
        setIsOwner(false);
        return;
      }

      const { data: memberships } = await supabase
        .from("gym_memberships")
        .select("role")
        .eq("user_id", session.user.id);
      if (mounted) setIsOwner((memberships || []).some((membership) => membership.role === "owner"));
    };

    supabase.auth.getSession().then(({ data }) => updateUserState(data.session));

    // Expose supabase client for short-term debugging in the browser console
    try {
      (window as any).supabase = supabase;
    } catch (e) {
      /* ignore in non-browser environments */
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      updateUserState(session);
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
    setIsOwner(false);
    router.push("/");
  };

  return (
    <header className="w-full border-b p-4 mb-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <nav className="flex gap-4">
          <Link href="/classes">Clases</Link>
          {isOwner ? <Link href="/gyms">Mis gimnasios</Link> : null}
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
