"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MePage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? "");
    });
  }, []);

  return (
    <div>
      <h1>Mi Perfil</h1>
      <p>{email}</p>
    </div>
  );
}