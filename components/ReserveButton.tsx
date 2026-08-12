"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ReserveButton({
  classId,
}: {
  classId: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reserved, setReserved] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // fetch class capacity
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("capacity")
        .eq("id", classId)
        .maybeSingle();

      if (classError) {
        console.error(classError);
      }

      // count reservations for the class
      const { data: reservationsData, count } = await supabase
        .from("reservations")
        .select("id", { count: "exact" })
        .eq("class_id", classId);

      const capacity = classData?.capacity ?? null;
      const reservedCount = count ?? (reservationsData?.length ?? 0);

      if (mounted) {
        if (capacity !== null) setSpotsLeft(Math.max(0, capacity - reservedCount));
      }

      // check if current user already reserved
      if (session && mounted) {
        const { data: myRes } = await supabase
          .from("reservations")
          .select("id")
          .eq("class_id", classId)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (mounted) setReserved(!!myRes);
      }

      if (mounted) setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [classId]);

  const reserve = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    if (reserved) {
      alert("Ya tenés esta clase reservada");
      return;
    }

    if (spotsLeft !== null && spotsLeft <= 0) {
      alert("No quedan cupos para esta clase");
      return;
    }

    const { error } = await supabase
      .from("reservations")
      .insert({
        user_id: session.user.id,
        class_id: classId,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setReserved(true);
    setSpotsLeft((s) => (s === null ? null : Math.max(0, s - 1)));

    alert("Reserva realizada");
  };

  const disabled = loading || reserved || (spotsLeft !== null && spotsLeft <= 0);

  let label = "Reservar";
  if (loading) label = "Cargando...";
  else if (reserved) label = "Reservado";
  else if (spotsLeft !== null && spotsLeft <= 0) label = "Agotado";

  return (
    <button
      onClick={reserve}
      disabled={disabled}
      className={`bg-green-600 text-white px-4 py-2 rounded mt-2 ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      {label}
      {spotsLeft !== null && !loading && !reserved ? (
        <span className="ml-2 text-sm">({spotsLeft} cupos)</span>
      ) : null}
    </button>
  );
}