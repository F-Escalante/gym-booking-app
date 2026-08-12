import { supabase } from "@/lib/supabase";
import ReserveButton from "@/components/ReserveButton";
import ClassesFilter from "@/components/ClassesFilter";

export default async function ClassesPage({ searchParams }: { searchParams?: { activity?: string; date?: string; time?: string } }) {
  const activity = searchParams?.activity ?? null;
  const date = searchParams?.date ?? null;

  let query = supabase.from("classes").select("*");
  if (activity) {
    query = query.ilike("title", `%${activity}%`);
  }

  if (date) {
    // filter between start and end of the selected date (UTC)
    const start = `${date}T00:00:00Z`;
    const end = `${date}T23:59:59Z`;
    query = query.gte("class_date", start).lte("class_date", end);
  }

  const { data: classes } = await query.order("class_date", { ascending: true });

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
    </main>
  );
}