import { redirect } from "next/navigation";
import { ItemForm } from "@/components/item-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewItemPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return <main className="min-h-screen px-5 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><ItemForm /></div></main>;
}
