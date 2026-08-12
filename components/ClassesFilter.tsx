"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function ClassesFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activity, setActivity] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    setActivity(searchParams.get("activity") ?? "");
    setDate(searchParams.get("date") ?? "");
    setTime(searchParams.get("time") ?? "");
  }, [searchParams]);

  const apply = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (activity) params.set("activity", activity);
    if (date) params.set("date", date);
    if (time) params.set("time", time);
    const qs = params.toString();
    const base = pathname || "/classes";
    router.push(`${base}${qs ? `?${qs}` : ""}`);
  };

  const clear = () => {
    setActivity("");
    setDate("");
    setTime("");
    const base = pathname || "/classes";
    router.push(base);
  };

  return (
    <form onSubmit={apply} className="mb-6 p-4 border rounded-lg">
      <div className="flex gap-2 flex-wrap">
        <input
          placeholder="Actividad (p. ej. Yoga)"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          className="border p-2"
        />

        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-2" />

        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border p-2" />

        <button className="bg-blue-600 text-white px-3 py-1 rounded" type="submit">Filtrar</button>
        <button type="button" onClick={clear} className="bg-gray-300 px-3 py-1 rounded">Limpiar</button>
      </div>
    </form>
  );
}
