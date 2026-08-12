import { redirect } from "next/navigation";
import { ItemPage } from "@/components/item-page";
import { createClient } from "@/lib/supabase/server";

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  const { id } = await params;
  return <ItemPage id={id} />;
}
