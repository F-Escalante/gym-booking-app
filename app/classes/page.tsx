import { supabase } from "@/lib/supabase";
import ReserveButton from "@/components/ReserveButton";

export default async function ClassesPage() {
  const { data: classes } = await supabase
    .from("classes")
    .select("*");

  return (
    <main className="p-8">
        
      <h1 className="text-3xl font-bold mb-6">
        Clases
      </h1>

      {classes?.map((gymClass) => (
        <div
          key={gymClass.id}
          className="border rounded p-4 mb-4"
        >
          <h2>{gymClass.title}</h2>

          <p>{gymClass.description}</p>

          <ReserveButton classId={gymClass.id} />
        </div>
      ))}
    </main>
  );
}