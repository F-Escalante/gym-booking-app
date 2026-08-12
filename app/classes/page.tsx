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
          <h2>{gymClass.title}</h2>

          <p>{gymClass.description}</p>

          <ReserveButton classId={gymClass.id} />
        </div>
      ))}
    </main>
  );
}