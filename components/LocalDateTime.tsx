"use client";

import { useMemo } from "react";

export default function LocalDateTime({ iso, locale = "es-ES" }: { iso?: string | null; locale?: string }) {
  const formatted = useMemo(() => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      // Show the stored instant as-is (UTC) so the displayed wall time matches what's in the DB
      const dateStr = d.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
      const timeStr = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
      return `${dateStr} — ${timeStr}`;
    } catch (e) {
      return iso;
    }
  }, [iso, locale]);

  return <span>{formatted}</span>;
}
