import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServerClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function getUser(request: Request, supabase: NonNullable<ReturnType<typeof getServerClient>>) {
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
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return NextResponse.json({ error: "Missing invitation code" }, { status: 400 });

  const { data: invitation, error: invitationError } = await supabase
    .from("gym_invitations")
    .select("id, gym_id, code, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

  if (invitationError) return NextResponse.json({ error: invitationError.message }, { status: 500 });
  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.expires_at && new Date(invitation.expires_at) <= new Date()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }

  const { data: existingMembership, error: existingError } = await supabase
    .from("gym_memberships")
    .select("gym_id")
    .eq("gym_id", invitation.gym_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (existingMembership) return NextResponse.json({ error: "You are already a member of this gym" }, { status: 409 });

  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("id, name")
    .eq("id", invitation.gym_id)
    .single();
  if (gymError || !gym) return NextResponse.json({ error: "Gym not found" }, { status: 404 });

  const { error: membershipError } = await supabase
    .from("gym_memberships")
    .insert({ gym_id: invitation.gym_id, user_id: user.id, role: "member", status: "pending" });
  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 });

  return NextResponse.json({ data: gym }, { status: 200 });
}
