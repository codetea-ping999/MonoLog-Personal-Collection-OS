"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Check, KeyRound, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6 || password !== confirmation) {
      setError(password.length < 6 ? "パスワードは6文字以上で入力してください" : "パスワードが一致しません");
      return;
    }
    setBusy(true);
    setError("");
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return <main className="noise flex min-h-screen items-center justify-center px-5 py-10"><div className="w-full max-w-md rounded-[2rem] border border-[var(--line)] bg-white/80 p-8 shadow-[0_30px_100px_rgba(22,66,61,0.12)] sm:p-12"><div className="mb-10 flex items-center gap-3 text-sm font-bold tracking-[0.18em] text-[var(--forest)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--mint)]"><Sparkles size={17} /></span> MONOLOG</div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--coral)]">Security</p><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--forest)]">新しいパスワード</h1><p className="mt-4 text-sm leading-6 text-[var(--muted)]">新しいパスワードを設定してください。</p><form onSubmit={submit} className="mt-9 space-y-5"><label className="block text-sm font-semibold">新しいパスワード<span className="relative mt-2 block"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><input className="focus-ring w-full rounded-2xl border border-[var(--line)] bg-[#fbfcf9] py-3.5 pl-11 pr-4 text-sm outline-none focus:border-[var(--forest)]" type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></span></label><label className="block text-sm font-semibold">もう一度入力<span className="relative mt-2 block"><Check className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><input className="focus-ring w-full rounded-2xl border border-[var(--line)] bg-[#fbfcf9] py-3.5 pl-11 pr-4 text-sm outline-none focus:border-[var(--forest)]" type="password" minLength={6} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></span></label>{error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--forest)] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <>パスワードを更新 <ArrowRight size={18} /></>}</button></form></div></main>;
}
