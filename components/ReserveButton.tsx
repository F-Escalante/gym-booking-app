"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ReserveButton({
  classId,
}: {
  classId: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

      const availabilityResponse = await fetch(`/api/classes/${classId}/availability`);
      const availability = await availabilityResponse.json();
      if (!availabilityResponse.ok) console.error(availability.error);
      if (mounted && availabilityResponse.ok) setSpotsLeft(availability.spotsLeft);

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
      const qs = searchParams?.toString();
      const full = `${pathname}${qs ? `?${qs}` : ""}`;
      router.push(`/login?next=${encodeURIComponent(full || "/")}`);
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

    // Re-read the authoritative count so every user sees the current availability.
    const availabilityResponse = await fetch(`/api/classes/${classId}/availability`);
    const availability = await availabilityResponse.json();
    if (availabilityResponse.ok) setSpotsLeft(availability.spotsLeft);

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