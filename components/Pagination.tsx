"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function Pagination({ current, totalPages }: { current: number; totalPages: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const go = (p: number) => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    const qs = params.toString();
    router.push(`/classes${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => go(Math.max(1, current - 1))} className="px-2 py-1 border rounded">Anterior</button>
      <span className="text-sm">{current} / {totalPages}</span>
      <button onClick={() => go(Math.min(totalPages, current + 1))} className="px-2 py-1 border rounded">Siguiente</button>
    </div>
  );
}
