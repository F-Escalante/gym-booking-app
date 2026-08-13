import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const ADMIN_SECRET = process.env.ADMIN_API_SECRET as string | undefined;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in your environment."
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function isAdminRequest(req: Request) {
  // Prefer token-based auth: Authorization: Bearer <access_token>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token as string);
      if (userErr || !userData?.user) return false;
      const userId = userData.user.id;
      const { data: adminRow, error: adminErr } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
      if (adminErr) return false;
      return !!adminRow;
    } catch (e) {
      return false;
    }
  }

  // Fallback: x-admin-secret header
  if (ADMIN_SECRET) {
    const secret = req.headers.get("x-admin-secret");
    return secret === ADMIN_SECRET;
  }

  return false;
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, class_date, capacity } = body;

  if (!title || !class_date || !capacity) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({ title, description, class_date, capacity })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function PUT(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, title, description, class_date, capacity } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const payload: any = {};
  if (title !== undefined) payload.title = title;
  if (description !== undefined) payload.description = description;
  if (class_date !== undefined) payload.class_date = class_date;
  if (capacity !== undefined) payload.capacity = capacity;

  const { data, error } = await supabase
    .from("classes")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id param" }, { status: 400 });

  const { data, error } = await supabase.from("classes").delete().eq("id", id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}
