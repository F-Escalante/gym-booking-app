import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

export async function POST(request: Request) {
  const supabase = getServerClient();
  if (!supabase) return NextResponse.json({ error: "Server is not configured" }, { status: 500 });

  const user = await getUser(request, supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const gymId = typeof body.gym_id === "string" ? body.gym_id : "";
  if (!gymId) return NextResponse.json({ error: "Missing gym_id" }, { status: 400 });

  const { data: membership, error: membershipError } = await supabase
    .from("gym_memberships")
    .select("role")
    .eq("gym_id", gymId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 });
  if (membership?.role !== "owner") return NextResponse.json({ error: "Only the gym owner can create invitations" }, { status: 403 });

  const { data: existingInvitation, error: existingInvitationError } = await supabase
    .from("gym_invitations")
    .select("id, gym_id, code, expires_at, used_at, created_at")
    .eq("gym_id", gymId)
    .is("expires_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingInvitationError) {
    return NextResponse.json({ error: existingInvitationError.message }, { status: 500 });
  }

  if (existingInvitation) {
    return NextResponse.json({ data: existingInvitation }, { status: 200 });
  }

  const code = randomBytes(5).toString("hex").toUpperCase();
  const { data, error } = await supabase
    .from("gym_invitations")
    .insert({ gym_id: gymId, code, created_by: user.id })
    .select("id, gym_id, code, expires_at, used_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
