import { redirect } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { getSupabaseServer } from "@/lib/supabase/server";
import { AccountActions } from "./AccountActions";

export default async function AccountPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("id", user.id)
    .single();

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <>
      <TopNav />
      <main className="page-px py-16 max-w-2xl">
        <div className="eyebrow">Settings</div>
        <h1 className="display-2 mt-3">Account</h1>

        <div className="hairline-top mt-10" />

        <dl className="mt-10 space-y-6">
          <Row label="Email" value={user.email ?? "—"} />
          <Row label="Name" value={profile?.full_name ?? "—"} />
          <Row label="Member since" value={memberSince ?? "—"} />
        </dl>

        <div className="hairline-bot mt-10" />

        <div className="mt-10">
          <AccountActions />
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 items-baseline gap-6">
      <dt className="eyebrow col-span-1">{label}</dt>
      <dd className="col-span-2 text-[15px]">{value}</dd>
    </div>
  );
}
