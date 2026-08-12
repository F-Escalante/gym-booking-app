import { supabase } from "@/lib/supabase";
import ReserveButton from "@/components/ReserveButton";
import ClassesFilter from "@/components/ClassesFilter";
import Pagination from "@/components/Pagination";

export default async function ClassesPage({ searchParams }: { searchParams?: { activity?: string; date?: string; time?: string; page?: string } }) {
  const activity = searchParams?.activity ?? null;
  const date = searchParams?.date ?? null;
  const time = searchParams?.time ?? null;
  const page = parseInt(searchParams?.page || "1", 10) || 1;
  const perPage = 10;

  let base = supabase.from("classes");
  if (activity) {
    base = base.ilike("title", `%${activity}%`);
  }

  if (date) {
    if (time) {
      // filter for the selected minute on that date
      const normalizedTime = time.length === 5 ? `${time}:00` : time;
      const start = `${date}T${normalizedTime}Z`;
      // end at end of that minute
      const end = `${date}T${normalizedTime.slice(0,5)}:59Z`;
      base = base.gte("class_date", start).lte("class_date", end);
    } else {
      const start = `${date}T00:00:00Z`;
      const end = `${date}T23:59:59Z`;
      base = base.gte("class_date", start).lte("class_date", end);
    }
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data: classes, count, error } = await base
    .select("*", { count: "exact" })
    .order("class_date", { ascending: true })
    .range(from, to);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold mb-6">Clases</h1>
        <p className="text-red-600">Error al cargar clases: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Clases</h1>

      <ClassesFilter />

      {classes?.map((gymClass) => (
        <div key={gymClass.id} className="border rounded p-4 mb-4">
          <h2 className="text-xl font-semibold">{gymClass.title}</h2>

          <p className="text-sm text-gray-700">{gymClass.description}</p>

          {gymClass.class_date && (
            (() => {
              const d = new Date(gymClass.class_date);
              const dateStr = d.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
              const timeStr = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
              return (
                <p className="text-sm text-gray-600 mt-2">{dateStr} — {timeStr}</p>
              );
            })()
          )}

          <div className="mt-3">
            <ReserveButton classId={gymClass.id} />
          </div>
        </div>
      ))}

      <div className="mt-6 flex items-center gap-3">
        <Pagination current={page} totalPages={totalPages} />
        <p className="text-sm text-gray-600">Mostrando {classes?.length ?? 0} de {total} clases</p>
      </div>
    </main>
  );
}
