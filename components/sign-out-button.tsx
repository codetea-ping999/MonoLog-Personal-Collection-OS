"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <button onClick={signOut} className="focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--forest)]"><LogOut size={15} /> ログアウト</button>;
}
