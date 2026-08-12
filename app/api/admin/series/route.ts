import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const ADMIN_SECRET = process.env.ADMIN_API_SECRET as string | undefined;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function getAdminUserId(req: Request) {
  // Token-based auth
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token as string);
      if (userErr || !userData?.user) return null;
      const userId = userData.user.id;
      const { data: adminRow, error: adminErr } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
      if (adminErr) return null;
      return adminRow ? userId : null;
    } catch (e) {
      return null;
    }
  }

  // Fallback to admin secret
  if (ADMIN_SECRET) {
    const secret = req.headers.get("x-admin-secret");
    if (secret === ADMIN_SECRET) return null; // null indicates unknown creator but authorized via secret
  }

  return null;
}

export async function POST(req: Request) {
  const adminUserId = await getAdminUserId(req);
  // if neither token-based admin nor secret provided, reject
  const authHeader = req.headers.get("authorization");
  const hasSecret = ADMIN_SECRET && req.headers.get("x-admin-secret") === ADMIN_SECRET;
  if (!adminUserId && !authHeader && !hasSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, capacity, weekdays, time, start_date, end_date } = body;

  if (!title || !capacity || !weekdays || !time || !start_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const params = {
      p_title: title,
      p_description: description || null,
      p_capacity: capacity,
      p_weekdays: weekdays,
      p_time: time,
      p_start_date: start_date,
      p_end_date: end_date || start_date,
      p_created_by: adminUserId,
    } as any;

    const { data, error } = await supabase.rpc("create_class_series_and_instances", params);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const adminUserId = await getAdminUserId(req);
  const authHeader = req.headers.get("authorization");
  const hasSecret = ADMIN_SECRET && req.headers.get("x-admin-secret") === ADMIN_SECRET;
  if (!adminUserId && !authHeader && !hasSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase.from("class_series").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const adminUserId = await getAdminUserId(req);
  const authHeader = req.headers.get("authorization");
  const hasSecret = ADMIN_SECRET && req.headers.get("x-admin-secret") === ADMIN_SECRET;
  if (!adminUserId && !authHeader && !hasSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, title, description, capacity, weekdays, time, start_date, end_date, propagate } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const payload: any = {};
  if (title !== undefined) payload.title = title;
  if (description !== undefined) payload.description = description;
  if (capacity !== undefined) payload.capacity = capacity;
  if (weekdays !== undefined) payload.weekdays = weekdays;
  if (time !== undefined) payload.time = time;
  if (start_date !== undefined) payload.start_date = start_date;
  if (end_date !== undefined) payload.end_date = end_date;

  try {
    const { data, error } = await supabase.from("class_series").update(payload).eq("id", id).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // If requested, propagate some fields to future class instances
    if (propagate) {
      try {
        const nowIso = new Date().toISOString();
        const { data: instances, error: instErr } = await supabase
          .from("classes")
          .select("id, class_date")
          .eq("series_id", id)
          .gt("class_date", nowIso);
        if (instErr) throw instErr;

        // Update each future instance: title/description/capacity and optionally time
        for (const inst of instances || []) {
          const updates: any = {};
          if (title !== undefined) updates.title = title;
          if (description !== undefined) updates.description = description;
          if (capacity !== undefined) updates.capacity = capacity;

          if (time !== undefined) {
            // compute new class_date preserving the original date (UTC) and applying new time
            const orig = new Date(inst.class_date);
            const yyyy = orig.getUTCFullYear();
            const mm = String(orig.getUTCMonth() + 1).padStart(2, "0");
            const dd = String(orig.getUTCDate()).padStart(2, "0");
            // normalize time string 'HH:MM' or 'HH:MM:SS'
            const normalizedTime = time.length === 5 ? `${time}:00` : time;
            const newIso = `${yyyy}-${mm}-${dd}T${normalizedTime}Z`;
            updates.class_date = newIso;
          }

          await supabase.from("classes").update(updates).eq("id", inst.id);
        }
      } catch (e: any) {
        // log but don't fail the whole request
        console.error("Error propagating series updates:", e?.message || e);
      }
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const adminUserId = await getAdminUserId(req);
  const authHeader = req.headers.get("authorization");
  const hasSecret = ADMIN_SECRET && req.headers.get("x-admin-secret") === ADMIN_SECRET;
  if (!adminUserId && !authHeader && !hasSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const cascade = url.searchParams.get("cascade") === "1";
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (cascade) {
      // delete instances
      const { error: delErr } = await supabase.from("classes").delete().eq("series_id", id);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const { data, error } = await supabase.from("class_series").delete().eq("id", id).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
