import { supabase } from "@/lib/supabase";
import ReserveButton from "@/components/ReserveButton";
import ClassesFilter from "@/components/ClassesFilter";
import Pagination from "@/components/Pagination";
import LocalDateTime from "@/components/LocalDateTime";

export default async function ClassesPage({ searchParams }: { searchParams?: { activity?: string; date?: string; time?: string; page?: string } }) {
  // searchParams can be a Promise in some Next.js runtimes — await it before use
  const sp = await (searchParams as any);
  const activity = sp?.activity ?? null;
  const date = sp?.date ?? null;
  const time = sp?.time ?? null;
  const page = parseInt(sp?.page || "1", 10) || 1;
  const perPage = 10;

  function buildClassesQuery() {
    let q: any = supabase.from("classes").select("*", { count: "exact" });
    if (activity) {
      q = q.filter("title", "ilike", `%${activity}%`);
    }

    if (date) {
      if (time) {
        const normalizedTime = time.length === 5 ? `${time}:00` : time;
        const start = `${date}T${normalizedTime}Z`;
        const end = `${date}T${normalizedTime.slice(0, 5)}:59Z`;
        q = q.filter("class_date", "gte", start).filter("class_date", "lte", end);
      } else {
        const start = `${date}T00:00:00Z`;
        const end = `${date}T23:59:59Z`;
        q = q.filter("class_date", "gte", start).filter("class_date", "lte", end);
      }
    }

    return q;
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const q = buildClassesQuery();
  const { data: classes, count, error } = await q.order("class_date", { ascending: true }).range(from, to);

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
            <p className="text-sm text-gray-600 mt-2"><LocalDateTime iso={gymClass.class_date} /></p>
          )}
          <div className="text-xs text-gray-500 mt-1">raw: {String(gymClass.class_date)}</div>

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
