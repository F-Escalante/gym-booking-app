"use client";

import { useMemo } from "react";

export default function LocalDateTime({ iso, locale = "es-ES" }: { iso?: string | null; locale?: string }) {
  const formatted = useMemo(() => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const dateStr = d.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "short", day: "numeric" });
      const timeStr = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
      return `${dateStr} — ${timeStr}`;
    } catch (e) {
      return iso;
    }
  }, [iso, locale]);

  return <span>{formatted}</span>;
}
