import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: classes } = await supabase
    .from("classes")
    .select("*");

  return (
    <main className="p-8 max-w-4xl mx-auto">

      <nav className="flex gap-4 mb-6">
        <Link href="/classes">
          Clases
        </Link>

        <Link href="/reservations">
          Mis Reservas
        </Link>

        <Link href="/me">
          Mi Perfil
        </Link>

        <Link href="/login">
          Login
        </Link>
      </nav>

      <h1 className="text-3xl font-bold mb-6">
        Clases Disponibles
      </h1>

      <div className="space-y-4">
        {classes?.map((gymClass) => (
          <div
            key={gymClass.id}
            className="border rounded-lg p-4 shadow"
          >
            <h2 className="text-xl font-semibold">
              {gymClass.title}
            </h2>

            <p>{gymClass.description}</p>

            <p>Cupos: {gymClass.capacity}</p>

            <p>
              Fecha:{" "}
              {new Date(
                gymClass.class_date
              ).toLocaleString("es-AR")}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}