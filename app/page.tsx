import { redirect } from "next/navigation";
import { CollectionDashboard } from "@/components/collection-dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  return <CollectionDashboard userEmail={email} />;
}
