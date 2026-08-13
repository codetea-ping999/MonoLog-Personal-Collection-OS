import { redirect } from "next/navigation";
import { BulkItemForm } from "@/components/bulk-item-form";
import { createClient } from "@/lib/supabase/server";

export default async function BulkItemsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return <main className="min-h-screen px-5 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><BulkItemForm /></div></main>;
}
