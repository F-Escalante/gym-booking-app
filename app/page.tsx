import { redirect } from "next/navigation";

export default async function Home() {
  // Redirect users to the classes listing — avoids duplicate UI and keeps home simple
  redirect("/classes");
}