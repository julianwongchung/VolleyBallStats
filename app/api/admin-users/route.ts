import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseAdminClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { supabaseUrl } from "@/lib/supabase/config";

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function requireCurrentAdmin() {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured.", status: 500 as const };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) return { error: "You must be signed in.", status: 401 as const };

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError) return { error: adminError.message, status: 500 as const };
  if (!adminRow) return { error: "Admin access is required.", status: 403 as const };

  return { user };
}

async function findAuthUserByEmail(adminClient: SupabaseClient, email: string) {
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);
  return data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
}

async function upsertAdminUser(adminClient: SupabaseClient, userId: string, email: string) {
  const timestamp = new Date().toISOString();
  const { error } = await adminClient.from("admin_users").upsert({
    user_id: userId,
    email,
    updated_at: timestamp
  });
  if (!isMissingAdminUpdatedAtColumn(error)) return error;

  const { error: fallbackError } = await adminClient.from("admin_users").upsert({
    user_id: userId,
    email
  });
  return fallbackError;
}

async function touchAdminUser(adminClient: SupabaseClient, userId: string) {
  const { error } = await adminClient
    .from("admin_users")
    .update({ updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (isMissingAdminUpdatedAtColumn(error)) return null;
  return error;
}

export async function POST(request: NextRequest) {
  const currentAdmin = await requireCurrentAdmin();
  if ("error" in currentAdmin) {
    return NextResponse.json({ error: currentAdmin.error }, { status: currentAdmin.status });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  let authUser: User | null = createdUser?.user ?? null;

  if (createError || !authUser) {
    const createMessage = createError?.message.toLowerCase() ?? "";
    const userAlreadyExists = createMessage.includes("already") || createMessage.includes("registered");
    if (!userAlreadyExists) {
      return NextResponse.json({ error: createError?.message ?? "Unable to create user." }, { status: 400 });
    }

    try {
      authUser = await findAuthUserByEmail(adminClient, email);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unable to find existing user." },
        { status: 400 }
      );
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "This email already exists in Auth, but the user could not be found." },
        { status: 400 }
      );
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(authUser.id, { password });
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const upsertError = await upsertAdminUser(adminClient, authUser.id, email);
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });

  return NextResponse.json({
    user: {
      userId: authUser.id,
      email
    }
  });
}

export async function PATCH(request: NextRequest) {
  const currentAdmin = await requireCurrentAdmin();
  if ("error" in currentAdmin) {
    return NextResponse.json({ error: currentAdmin.error }, { status: currentAdmin.status });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { userId?: string; password?: string };
  const userId = body.userId?.trim();
  const password = body.password ?? "";

  if (!userId) return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const touchError = await touchAdminUser(adminClient, userId);
  if (touchError) return NextResponse.json({ error: touchError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

function isMissingAdminUpdatedAtColumn(error: { code?: string; message?: string; details?: string | null } | null) {
  if (!error) return false;
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    text.includes("updated_at") &&
    (error.code === "PGRST204" ||
      error.code === "42703" ||
      text.includes("schema cache") ||
      text.includes("does not exist") ||
      text.includes("could not find"))
  );
}
