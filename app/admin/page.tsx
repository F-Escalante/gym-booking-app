"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classDate, setClassDate] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login?next=/admin");
        return;
      }
      setSession(data.session);
      setAuthLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authLoading) {
      const loadClasses = async () => {
        const { data, error } = await supabase.from("classes").select("*");
        if (error) {
          setError(error.message);
          return;
        }
        setClasses(data || []);
      };

      loadClasses();
    }
  }, [authLoading]);

  const saveClass = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Basic validations
    if (!title || !title.trim()) {
      setLoading(false);
      setError("El título es obligatorio.");
      return;
    }

    if (!classDate) {
      setLoading(false);
      setError("La fecha/hora de la clase es obligatoria.");
      return;
    }

    if (!capacity || capacity < 1) {
      setLoading(false);
      setError("La capacidad debe ser al menos 1.");
      return;
    }

    const classPayload: any = {
      title: title.trim(),
      description,
      class_date: classDate,
      capacity,
    };

    // Call internal admin API with Bearer token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setLoading(false);
      router.push(`/login?next=/admin`);
      return;
    }

    try {
      const url = "/api/admin/classes";
      const method = selectedClassId ? "PUT" : "POST";
      const body = selectedClassId ? { id: selectedClassId, ...classPayload } : classPayload;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(json?.error || "Error al guardar la clase");
        return;
      }
    } catch (e: any) {
      setLoading(false);
      setError(e?.message || String(e));
      return;
    }

    setSuccess(selectedClassId ? "Clase actualizada correctamente." : "Clase creada correctamente.");
    setSelectedClassId(null);
    setTitle("");
    setDescription("");
    setClassDate("");
    setCapacity(1);

    const { data } = await supabase.from("classes").select("*");
    setClasses(data || []);
  };

  const editClass = (gymClass: any) => {
    setSelectedClassId(gymClass.id);
    setTitle(gymClass.title ?? "");
    setDescription(gymClass.description ?? "");
    setClassDate(gymClass.class_date?.slice(0, 16) ?? "");
    setCapacity(gymClass.capacity ?? 1);
    setError(null);
    setSuccess(null);
  };

  const deleteClass = async (id: string) => {
    if (!confirm("¿Querés eliminar esta clase?")) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setLoading(false);
      router.push(`/login?next=/admin`);
      return;
    }

    try {
      const res = await fetch(`/api/admin/classes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(json?.error || "Error al eliminar la clase");
        return;
      }

      setSuccess("Clase eliminada correctamente.");
      const { data } = await supabase.from("classes").select("*");
      setClasses(data || []);
    } catch (e: any) {
      setLoading(false);
      setError(e?.message || String(e));
      return;
    }
  };

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Administrador de Clases</h1>

      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">
          {selectedClassId ? "Editar clase" : "Crear nueva clase"}
        </h2>

        {success ? (
          <p className="text-green-600 mb-3">{success}</p>
        ) : null}

        <input
          className="border p-2 w-full mb-2"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="border p-2 w-full mb-2"
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="datetime-local"
          className="border p-2 w-full mb-2"
          value={classDate}
          onChange={(e) => setClassDate(e.target.value)}
        />
        <input
          type="number"
          className="border p-2 w-full mb-2"
          placeholder="Cupos"
          value={capacity}
          min={1}
          onChange={(e) => setCapacity(Number(e.target.value))}
        />

        <button
          onClick={saveClass}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {loading
            ? "Guardando..."
            : selectedClassId
            ? "Actualizar clase"
            : "Crear clase"}
        </button>

        {selectedClassId ? (
          <button
            onClick={() => {
              setSelectedClassId(null);
              setTitle("");
              setDescription("");
              setClassDate("");
              setCapacity(1);
              setError(null);
              setSuccess(null);
            }}
            className="ml-3 bg-gray-300 text-black px-4 py-2 rounded"
          >
            Cancelar
          </button>
        ) : null}

        {error ? (
          <p className="text-red-600 mt-3">{error}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        {classes.map((gymClass) => (
          <div key={gymClass.id} className="border rounded-lg p-4 shadow">
            <h3 className="text-xl font-semibold">{gymClass.title}</h3>
            <p>{gymClass.description}</p>
            <p>Fecha: {new Date(gymClass.class_date).toLocaleString("es-AR")}</p>
            <p>Cupos: {gymClass.capacity}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => editClass(gymClass)}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Editar
              </button>
              <button
                onClick={() => deleteClass(gymClass.id)}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
