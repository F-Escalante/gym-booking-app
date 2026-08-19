"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LocalDateTime from "@/components/LocalDateTime";

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
  const [classSearch, setClassSearch] = useState("");
  const [classDateFilter, setClassDateFilter] = useState("");
  const [classStatusFilter, setClassStatusFilter] = useState("all");
  const [attendeesByClass, setAttendeesByClass] = useState<Record<string, any[]>>({});
  const [loadingAttendeesId, setLoadingAttendeesId] = useState<string | null>(null);
  const [seriesTitle, setSeriesTitle] = useState("");
  const [seriesDescription, setSeriesDescription] = useState("");
  const [seriesCapacity, setSeriesCapacity] = useState(1);
  const [seriesWeekdays, setSeriesWeekdays] = useState<number[]>([]);
  const [seriesTime, setSeriesTime] = useState("");
  const [seriesStartDate, setSeriesStartDate] = useState("");
  const [seriesEndDate, setSeriesEndDate] = useState("");
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [propagateOnUpdate, setPropagateOnUpdate] = useState(true);
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
      const loadAll = async () => {
        const [{ data: classesData, error: classesErr }, { data: seriesData, error: seriesErr }] = await Promise.all([
          supabase.from("classes").select("*"),
          supabase.from("class_series").select("*"),
        ]);

        if (classesErr) {
          setError(classesErr.message);
          return;
        }
        if (seriesErr) {
          setError(seriesErr.message);
          return;
        }

        setClasses(classesData || []);
        setSeriesList(seriesData || []);
      };

      loadAll();
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

    // Convert the `datetime-local` value (local time) into an ISO in UTC
    const toUtcIso = (localDateTime: string) => {
      if (!localDateTime) return null;
      // ensure seconds
      const normalized = localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
      const d = new Date(normalized);
      return d.toISOString();
    };

    const classPayload: any = {
      title: title.trim(),
      description,
      class_date: toUtcIso(classDate),
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
    // Convert stored ISO/timestamptz to `datetime-local` value in local time
    const toLocalInput = (iso?: string) => {
      if (!iso) return "";
      try {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch {
        return iso.slice(0, 16);
      }
    };

    setClassDate(toLocalInput(gymClass.class_date));
    setCapacity(gymClass.capacity ?? 1);
    setError(null);
    setSuccess(null);
  };

  const toggleWeekday = (d: number) => {
    setSeriesWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const createSeries = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!seriesTitle || !seriesTitle.trim()) {
      setLoading(false);
      setError("El título de la serie es obligatorio.");
      return;
    }
    if (!seriesWeekdays || seriesWeekdays.length === 0) {
      setLoading(false);
      setError("Seleccioná al menos un día de la semana para la recurrencia.");
      return;
    }
    if (!seriesTime) {
      setLoading(false);
      setError("Seleccioná la hora de la clase.");
      return;
    }
    if (!seriesStartDate) {
      setLoading(false);
      setError("Seleccioná la fecha de inicio.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setLoading(false);
      router.push(`/login?next=/admin`);
      return;
    }

    try {
      const url = selectedSeriesId ? `/api/admin/series` : `/api/admin/series`;
      const method = selectedSeriesId ? "PUT" : "POST";
      const body = selectedSeriesId
        ? {
            id: selectedSeriesId,
            title: seriesTitle.trim(),
            description: seriesDescription,
            capacity: seriesCapacity,
            weekdays: seriesWeekdays,
            time: seriesTime,
            start_date: seriesStartDate,
            end_date: seriesEndDate || null,
            propagate: propagateOnUpdate,
          }
        : {
            title: seriesTitle.trim(),
            description: seriesDescription,
            capacity: seriesCapacity,
            weekdays: seriesWeekdays,
            time: seriesTime,
            start_date: seriesStartDate,
            end_date: seriesEndDate || null,
          };

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
        setError(json?.error || (selectedSeriesId ? "Error al actualizar la serie" : "Error al crear la serie"));
        return;
      }

      setSuccess(selectedSeriesId ? "Serie actualizada correctamente." : "Serie creada y instancias generadas correctamente.");
      setSeriesTitle("");
      setSeriesDescription("");
      setSeriesCapacity(1);
      setSeriesWeekdays([]);
      setSeriesTime("");
      setSeriesStartDate("");
      setSeriesEndDate("");
      setSelectedSeriesId(null);

      // refresh classes and series
      const [{ data: classesData }, { data: seriesData }] = await Promise.all([
        supabase.from("classes").select("*"),
        supabase.from("class_series").select("*"),
      ]);
      setClasses(classesData || []);
      setSeriesList(seriesData || []);
    } catch (e: any) {
      setLoading(false);
      setError(e?.message || String(e));
    }
  };

  const editSeries = (s: any) => {
    setSelectedSeriesId(s.id);
    setSeriesTitle(s.title ?? "");
    setSeriesDescription(s.description ?? "");
    setSeriesCapacity(s.capacity ?? 1);
    setSeriesWeekdays(s.weekdays ?? []);
    setSeriesTime(s.time ?? "");
    setSeriesStartDate(s.start_date ?? "");
    setSeriesEndDate(s.end_date ?? "");
    setError(null);
    setSuccess(null);
  };

  const deleteSeries = async (id: string) => {
    if (!confirm("¿Querés eliminar la serie? Esto puede borrar también las instancias generadas.")) return;
    const cascade = confirm("Borrar también las instancias relacionadas? (Aceptar = sí)");
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
      const res = await fetch(`/api/admin/series?id=${encodeURIComponent(id)}${cascade ? "&cascade=1" : ""}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(json?.error || "Error al eliminar la serie");
        return;
      }

      setSuccess("Serie eliminada correctamente.");
      const [{ data: classesData }, { data: seriesData }] = await Promise.all([
        supabase.from("classes").select("*"),
        supabase.from("class_series").select("*"),
      ]);
      setClasses(classesData || []);
      setSeriesList(seriesData || []);
    } catch (e: any) {
      setLoading(false);
      setError(e?.message || String(e));
    }
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

  const loadAttendees = async (classId: string) => {
    if (attendeesByClass[classId]) {
      setAttendeesByClass((current) => {
        const next = { ...current };
        delete next[classId];
        return next;
      });
      return;
    }

    const token = session?.access_token;
    if (!token) return;

    setLoadingAttendeesId(classId);
    try {
      const response = await fetch(`/api/admin/classes?id=${encodeURIComponent(classId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error || "No se pudieron cargar las personas anotadas.");
        return;
      }
      setAttendeesByClass((current) => ({ ...current, [classId]: json.data || [] }));
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las personas anotadas.");
    } finally {
      setLoadingAttendeesId(null);
    }
  };

  const visibleClasses = classes
    .filter((gymClass) => {
      const matchesSearch = !classSearch.trim() || gymClass.title?.toLowerCase().includes(classSearch.trim().toLowerCase());
      const matchesDate = !classDateFilter || gymClass.class_date?.slice(0, 10) === classDateFilter;
      const attendeeCount = attendeesByClass[gymClass.id]?.length;
      const matchesStatus =
        classStatusFilter === "all" ||
        (classStatusFilter === "available" && (attendeeCount === undefined || attendeeCount < gymClass.capacity)) ||
        (classStatusFilter === "full" && attendeeCount !== undefined && attendeeCount >= gymClass.capacity);
      return matchesSearch && matchesDate && matchesStatus;
    })
    .sort((a, b) => new Date(a.class_date).getTime() - new Date(b.class_date).getTime());

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

      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Crear serie de clases (recurrencia)</h2>

        <input
          className="border p-2 w-full mb-2"
          placeholder="Título de la serie"
          value={seriesTitle}
          onChange={(e) => setSeriesTitle(e.target.value)}
        />
        <textarea
          className="border p-2 w-full mb-2"
          placeholder="Descripción"
          value={seriesDescription}
          onChange={(e) => setSeriesDescription(e.target.value)}
        />

        <div className="mb-2">
          <label className="block mb-1">Días de la semana</label>
          <div className="flex gap-2">
            {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((label, idx) => (
              <button
                key={idx}
                onClick={() => toggleWeekday(idx)}
                type="button"
                className={`px-2 py-1 rounded border ${seriesWeekdays.includes(idx) ? 'bg-blue-600 text-white' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-2">
          <label className="block mb-1">Hora</label>
          <input type="time" className="border p-2" value={seriesTime} onChange={(e) => setSeriesTime(e.target.value)} />
        </div>

        <div className="mb-2 flex gap-2">
          <div>
            <label className="block mb-1">Desde</label>
            <input type="date" className="border p-2" value={seriesStartDate} onChange={(e) => setSeriesStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1">Hasta (opcional)</label>
            <input type="date" className="border p-2" value={seriesEndDate} onChange={(e) => setSeriesEndDate(e.target.value)} />
          </div>
        </div>

        <div className="mb-2">
          <label className="block mb-1">Cupos</label>
          <input type="number" min={1} className="border p-2 w-32" value={seriesCapacity} onChange={(e) => setSeriesCapacity(Number(e.target.value))} />
        </div>

        <div className="flex items-center gap-4 mt-3">
          <button onClick={createSeries} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">
            {loading ? 'Creando...' : selectedSeriesId ? 'Actualizar serie' : 'Crear serie y generar instancias'}
          </button>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={propagateOnUpdate} onChange={(e) => setPropagateOnUpdate(e.target.checked)} />
            Propagar cambios a instancias futuras
          </label>
        </div>
      </div>

      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Series creadas</h2>
        {seriesList.length === 0 ? <p className="text-sm text-gray-600">No hay series aún.</p> : null}
        <div className="space-y-3">
          {seriesList.map((s) => (
            <div key={s.id} className="border rounded p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-gray-700">{s.description}</p>
                  <p className="text-sm text-gray-600">Días: {s.weekdays?.join(", ")}</p>
                  <p className="text-sm text-gray-600">Hora: {s.time}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => editSeries(s)} className="bg-blue-600 text-white px-3 py-1 rounded">Editar</button>
                  <button onClick={() => deleteSeries(s.id)} className="bg-red-600 text-white px-3 py-1 rounded">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-slate-300 bg-slate-100 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Clases programadas</h2>
            <p className="mt-1 text-sm text-slate-600">Filtrá la agenda y revisá las inscripciones de cada clase.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setClassSearch("");
              setClassDateFilter("");
              setClassStatusFilter("all");
            }}
            className="rounded border border-slate-400 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Actividad
            <input
              className="rounded border border-slate-400 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              placeholder="Buscar por título"
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Fecha
            <input
              type="date"
              className="rounded border border-slate-400 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              value={classDateFilter}
              onChange={(e) => setClassDateFilter(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Disponibilidad
            <select
              className="rounded border border-slate-400 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              value={classStatusFilter}
              onChange={(e) => setClassStatusFilter(e.target.value)}
            >
              <option value="all">Todas las clases</option>
              <option value="available">Con cupos</option>
              <option value="full">Completas</option>
            </select>
          </label>
        </div>
        <p className="mt-4 border-t border-slate-300 pt-3 text-sm text-slate-600">
          Mostrando <span className="font-semibold text-slate-900">{visibleClasses.length}</span> de {classes.length} clases.
        </p>
      </div>

      <div className="space-y-4">
        {visibleClasses.map((gymClass) => (
          <div key={gymClass.id} className="border rounded-lg p-4 shadow">
            <h3 className="text-xl font-semibold">{gymClass.title}</h3>
            <p>{gymClass.description}</p>
            <p>Fecha: <LocalDateTime iso={gymClass.class_date} locale="es-AR" /></p>
            <p>
              Cupos: {attendeesByClass[gymClass.id]?.length ?? "?"} / {gymClass.capacity}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => loadAttendees(gymClass.id)}
                disabled={loadingAttendeesId === gymClass.id}
                className="bg-indigo-600 text-white px-3 py-1 rounded"
              >
                {loadingAttendeesId === gymClass.id
                  ? "Cargando..."
                  : attendeesByClass[gymClass.id]
                  ? "Ocultar anotados"
                  : "Ver anotados"}
              </button>
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
            {attendeesByClass[gymClass.id] ? (
              <div className="mt-4 border-t pt-3">
                <h4 className="font-semibold">Personas anotadas ({attendeesByClass[gymClass.id].length})</h4>
                {attendeesByClass[gymClass.id].length === 0 ? (
                  <p className="text-sm text-gray-600 mt-1">Todavía no hay reservas.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {attendeesByClass[gymClass.id].map((attendee) => (
                      <li key={attendee.id} className="flex flex-wrap justify-between gap-2 border-b py-1">
                        <span>{attendee.name || attendee.email || attendee.user_id}</span>
                        {attendee.name && attendee.email ? <span className="text-gray-600">{attendee.email}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}
