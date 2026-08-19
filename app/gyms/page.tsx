"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Gym = {
  id: string;
  name: string;
  created_by: string;
};

export default function GymsPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [canCreateGym, setCanCreateGym] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadGyms = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/login?next=/gyms");
        return;
      }
      setCurrentUserId(user.id);

      const [{ data, error }, { data: canCreate, error: permissionError }, { data: memberships, error: membershipsError }] = await Promise.all([
        supabase
          .from("gyms")
          .select("id, name, created_by")
          .order("created_at", { ascending: true }),
        supabase.rpc("can_current_user_create_gym"),
        supabase.from("gym_memberships").select("role").eq("user_id", user.id),
      ]);

      if (error) {
        setMessage(error.message);
      } else if (permissionError || membershipsError) {
        setMessage(permissionError?.message || membershipsError?.message || "No se pudo cargar el perfil del gimnasio.");
      } else {
        setGyms(data || []);
        setCanCreateGym(canCreate === true);
        setIsOwner((memberships || []).some((membership) => membership.role === "owner"));
      }
      setLoading(false);
    };

    loadGyms();
  }, [router]);

  const createGym = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage("Ingresá el nombre del gimnasio.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      router.replace("/login?next=/gyms");
      return;
    }

    const { data, error: gymError } = await supabase.rpc("create_gym_for_current_user", {
      gym_name: trimmedName,
    });
    const gym = (Array.isArray(data) ? data[0] : data) as Gym | null;

    if (gymError || !gym) {
      setSaving(false);
      setMessage(gymError?.message || "No se pudo crear el gimnasio. Verificá que tengas permiso para crear uno.");
      return;
    }

    setGyms((current) => [...current, gym]);
    setSelectedGymId(gym.id);
    setName("");
    setSaving(false);
    setMessage("Gimnasio creado. Ahora podés administrar sus clases.");
  };

  const createInvitation = async (gymId: string) => {
    setSelectedGymId(gymId);
    setInvitationCode(null);
    setMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.replace("/login?next=/gyms");
      return;
    }

    const response = await fetch("/api/gyms/invitations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ gym_id: gymId }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "No se pudo crear la invitación.");
      return;
    }
    setInvitationCode(result.data.code);
  };

  const joinGym = async () => {
    const normalizedCode = joinCode.trim();
    if (!normalizedCode) {
      setJoinMessage("Ingresá el código de invitación.");
      return;
    }

    setJoining(true);
    setJoinMessage(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.replace("/login?next=/gyms");
      return;
    }

    const response = await fetch("/api/gyms/join", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code: normalizedCode }),
    });
    const result = await response.json();
    setJoining(false);
    if (!response.ok) {
      setJoinMessage(result.error || "No se pudo aceptar la invitación.");
      return;
    }

    setGyms((current) => [...current, result.data]);
    setJoinCode("");
    setJoinMessage(`Ya sos miembro de ${result.data.name}.`);
  };

  if (loading) {
    return <main className="mx-auto max-w-4xl p-8">Cargando gimnasios...</main>;
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-2 text-3xl font-bold">Mis gimnasios</h1>
      <p className="mb-6 text-gray-600">Administrá tus gimnasios y accedé a sus clases.</p>

      {canCreateGym ? (
        <section className="mb-8 rounded-lg border border-slate-300 bg-slate-100 p-5 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold text-slate-900">Crear gimnasio</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded border border-slate-400 bg-white px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              placeholder="Nombre del gimnasio"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              type="button"
              onClick={createGym}
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creando..." : "Crear gimnasio"}
            </button>
          </div>
          {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
        </section>
      ) : (
        <section className="mb-8 rounded-lg border border-slate-300 bg-slate-50 p-5">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Creación de gimnasios</h2>
          <p className="text-sm text-slate-600">
            Tu cuenta todavía no tiene habilitado el permiso para crear un gimnasio. Contactá al administrador.
          </p>
          {message ? <p className="mt-3 text-sm text-red-700">{message}</p> : null}
        </section>
      )}

      {isOwner ? <section>
        <h2 className="mb-3 text-xl font-semibold">Gimnasios disponibles</h2>
        {gyms.length === 0 ? (
          <p className="text-gray-600">Todavía no pertenecés a ningún gimnasio.</p>
        ) : (
          <div className="space-y-3">
            {gyms.map((gym) => (
              <div key={gym.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h3 className="font-semibold">{gym.name}</h3>
                  <p className="text-sm text-gray-600">
                    {gym.created_by === currentUserId ? "Propietario" : "Miembro"}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {gym.created_by === currentUserId ? (
                    <button
                      type="button"
                      onClick={() => createInvitation(gym.id)}
                      className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      Generar invitación
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => router.push(`/classes?gym=${encodeURIComponent(gym.id)}`)}
                    className="rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700"
                  >
                    Ver clases
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section> : null}

      {invitationCode && selectedGymId ? (
        <section className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Código de invitación</h2>
          <p className="text-sm text-slate-600">Compartí este código con un cliente. Es de un solo uso.</p>
          <p className="mt-3 rounded border border-blue-200 bg-white px-4 py-3 text-center text-2xl font-bold tracking-widest text-blue-800">
            {invitationCode}
          </p>
        </section>
      ) : null}

      <section className="mt-8 rounded-lg border border-slate-300 bg-slate-100 p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Unirme a un gimnasio</h2>
        <p className="mb-3 text-sm text-slate-600">Ingresá el código que te compartió el administrador.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded border border-slate-400 bg-white px-3 py-2 uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            placeholder="Código de invitación"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
          />
          <button
            type="button"
            onClick={joinGym}
            disabled={joining}
            className="rounded bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {joining ? "Ingresando..." : "Unirme"}
          </button>
        </div>
        {joinMessage ? <p className="mt-3 text-sm text-slate-700">{joinMessage}</p> : null}
      </section>
    </main>
  );
}
