import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Availability service is not configured" }, { status: 500 });
  }

  const { id } = await params;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: gymClass, error: classError } = await supabase
    .from("classes")
    .select("capacity")
    .eq("id", id)
    .maybeSingle();

  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (!gymClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const { count, error: reservationsError } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("class_id", id);

  if (reservationsError) return NextResponse.json({ error: reservationsError.message }, { status: 500 });

  const reservedCount = count ?? 0;
  return NextResponse.json({
    capacity: gymClass.capacity,
    reservedCount,
    spotsLeft: Math.max(0, gymClass.capacity - reservedCount),
  });
}
