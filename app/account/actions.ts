"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AccountState = { error?: string } | undefined;

export async function signOutAction() {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function deleteAccountAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "DELETE") {
    return { error: "Type DELETE in uppercase to confirm." };
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Admin deletion bypasses RLS and triggers the on-delete-cascade chain in
  // the schema, which drops the user's profile, pins, and pin_tags.
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
