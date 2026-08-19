import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const validStatuses = ["pending", "active", "suspended", "revoked"] as const;
type MembershipStatus = (typeof validStatuses)[number];

function getServerClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function getUser(request: Request, supabase: any) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

async function isOwner(supabase: any, gymId: string, userId: string) {
  const { data, error } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gymId)
    .eq("user_id", userId)
    .maybeSingle();
  return !error && data?.role === "owner";
}

export async function GET(request: Request) {
  const supabase = getServerClient();
  if (!supabase) return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
  const user = await getUser(request, supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gymId = new URL(request.url).searchParams.get("gym_id");
  if (!gymId) return NextResponse.json({ error: "Missing gym_id" }, { status: 400 });
  if (!(await isOwner(supabase, gymId, user.id))) return NextResponse.json({ error: "Only the gym owner can manage members" }, { status: 403 });

  const { data: memberships, error } = await supabase
    .from("gym_memberships")
    .select("gym_id, user_id, role, status, approved_at, suspended_at, created_at")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const members = await Promise.all(
    (memberships || []).map(async (membership) => {
      const { data } = await supabase.auth.admin.getUserById(membership.user_id);
      return {
        ...membership,
        email: data.user?.email ?? null,
        name: data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? null,
      };
    })
  );

  return NextResponse.json({ data: members });
}

export async function PATCH(request: Request) {
  const supabase = getServerClient();
  if (!supabase) return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
  const user = await getUser(request, supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const gymId = typeof body.gym_id === "string" ? body.gym_id : "";
  const memberId = typeof body.user_id === "string" ? body.user_id : "";
  const status = body.status as MembershipStatus;
  if (!gymId || !memberId || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid gym_id, user_id or status" }, { status: 400 });
  }
  if (!(await isOwner(supabase, gymId, user.id))) return NextResponse.json({ error: "Only the gym owner can manage members" }, { status: 403 });

  const updates: Record<string, string | null> = { status };
  if (status === "active") {
    updates.approved_at = new Date().toISOString();
    updates.suspended_at = null;
  } else if (status === "suspended") {
    updates.suspended_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("gym_memberships")
    .update(updates)
    .eq("gym_id", gymId)
    .eq("user_id", memberId)
    .neq("role", "owner")
    .select("gym_id, user_id, role, status, approved_at, suspended_at, created_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  return NextResponse.json({ data });
}
