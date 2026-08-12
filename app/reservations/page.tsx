"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MisReservasPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [deletingIds, setDeletingIds] = useState<(string | number)[]>([]);

  const loadReservations = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,
        created_at,
        classes (
          title,
          description,
          class_date
        )
      `)
      .eq("user_id", session.user.id);

    if (error) {
      console.error(error);
      return;
    }

    setReservations(data || []);
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const cancelReservation = async (id: string | number) => {
    if (!confirm("¿Querés cancelar esta reserva?")) return;

    setDeletingIds((s) => [...s, id]);

    const { data, error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      alert(error.message);
      setDeletingIds((s) => s.filter((x) => x !== id));
      // reload to reflect true state
      await loadReservations();
      return;
    }

    if (!data || data.length === 0) {
      // deletion didn't affect any row — reload from server
      alert("No se pudo cancelar la reserva (no encontrada en el servidor). Se recargará la lista.");
      setDeletingIds((s) => s.filter((x) => x !== id));
      await loadReservations();
      return;
    }

    setReservations((s) => s.filter((r) => r.id !== id));
    setDeletingIds((s) => s.filter((x) => x !== id));
  };

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">
        Mis Reservas
      </h1>

      {reservations.length === 0 ? (
        <p>No tienes reservas todavía.</p>
      ) : (
        reservations.map((reservation) => (
          <div
            key={reservation.id}
            className="border rounded-lg p-4 mb-4"
          >
            <h2 className="text-xl font-semibold">
              {reservation.classes?.title}
            </h2>

            <p>
              {reservation.classes?.description}
            </p>

            <p>
              Fecha:{" "}
              {new Date(
                reservation.classes?.class_date
              ).toLocaleString("es-AR")}
            </p>

            <div className="mt-3">
              <button
                onClick={() => cancelReservation(reservation.id)}
                disabled={deletingIds.includes(reservation.id)}
                className={`bg-red-600 text-white px-3 py-1 rounded ${
                  deletingIds.includes(reservation.id)
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
              >
                {deletingIds.includes(reservation.id)
                  ? "Cancelando..."
                  : "Cancelar reserva"}
              </button>
            </div>
          </div>
        ))
      )}
    </main>
  );
}