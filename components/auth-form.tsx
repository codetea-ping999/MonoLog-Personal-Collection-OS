"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, Mail, LockKeyhole, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "forgot";

export function AuthForm({ initialMode = "login" }: { initialMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const router = useRouter();

  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      setBusy(false);
      setMessage(error ? { kind: "error", text: error.message } : { kind: "success", text: "パスワード再設定用のメールを送信しました。" });
      return;
    }

    const result = isSignup
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (result.error) {
      setMessage({ kind: "error", text: result.error.message });
      return;
    }

    if (isSignup && !result.data.session) {
      setMessage({ kind: "success", text: "確認メールを送信しました。メール内のリンクから登録を完了してください。" });
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next") || "/";
    router.push(next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <main className="noise flex min-h-screen items-center justify-center px-5 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white/75 shadow-[0_30px_100px_rgba(22,66,61,0.12)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[var(--forest)] p-10 text-[#f4f7ef] lg:block">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[28px] border-[#4b8879]/25" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[#d9eee5]/10" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="mb-14 flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-[#b9ded0]">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d9eee5] text-[var(--forest)]"><Sparkles size={17} /></span>
                MONOLOG
              </div>
              <p className="max-w-sm text-4xl font-semibold leading-[1.15] tracking-[-0.04em]">集めたものに、<br />静かな居場所を。</p>
              <p className="mt-6 max-w-sm text-sm leading-7 text-[#c7ddd5]">本、映画、音楽、ゲーム。あなたの「好き」をひとつの場所に。MonoLogは、コレクションを記録し、いつでも見つけられる個人のためのOSです。</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#9fc8ba]"><Check size={16} /> あなたのデータはあなたのもの</div>
          </div>
        </section>

        <section className="p-7 sm:p-12 lg:p-16">
          <div className="mx-auto max-w-md">
            <div className="mb-10 lg:hidden"><span className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.18em] text-[var(--forest)]"><Sparkles size={16} /> MONOLOG</span></div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--coral)]">Personal Collection OS</p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--forest)] sm:text-4xl">{isForgot ? "パスワードを再設定" : isSignup ? "コレクションを始める" : "おかえりなさい"}</h1>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{isForgot ? "登録したメールアドレスに再設定リンクを送ります。" : isSignup ? "自分だけのコレクションを、ここから整えていきましょう。" : "あなたのコレクションが、ここで待っています。"}</p>

            <form onSubmit={submit} className="mt-9 space-y-5">
              <label className="block text-sm font-semibold text-[var(--ink)]">
                メールアドレス
                <span className="relative mt-2 block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><input className="focus-ring w-full rounded-2xl border border-[var(--line)] bg-[#fbfcf9] py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--forest)]" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></span>
              </label>
              {!isForgot && <label className="block text-sm font-semibold text-[var(--ink)]">
                パスワード
                <span className="relative mt-2 block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><input className="focus-ring w-full rounded-2xl border border-[var(--line)] bg-[#fbfcf9] py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--forest)]" type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="6文字以上" /></span>
              </label>}
              {message && <p className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.kind === "error" ? "bg-red-50 text-red-700" : "bg-[var(--mint)] text-[var(--forest)]"}`}>{message.text}</p>}
              <button disabled={busy} className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--forest)] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#225c54] disabled:cursor-wait disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <>{isForgot ? "再設定メールを送る" : isSignup ? "アカウントを作成" : "ログイン"}<ArrowRight size={18} /></>}</button>
            </form>

            <div className="mt-7 flex flex-col gap-3 text-center text-sm text-[var(--muted)]">
              {isForgot ? <button className="focus-ring font-semibold text-[var(--forest)] underline-offset-4 hover:underline" onClick={() => { setMode("login"); setMessage(null); }}>ログインに戻る</button> : <>
                {!isSignup && <button className="focus-ring self-center text-xs font-semibold text-[var(--muted)] underline-offset-4 hover:text-[var(--forest)] hover:underline" onClick={() => { setMode("forgot"); setMessage(null); }}>パスワードを忘れた方</button>}
                <p>{isSignup ? "すでにアカウントをお持ちですか？" : "はじめて使う方はこちら"} <button className="focus-ring font-bold text-[var(--forest)] underline-offset-4 hover:underline" onClick={() => { setMode(isSignup ? "login" : "signup"); setMessage(null); }}>{isSignup ? "ログイン" : "アカウントを作成"}</button></p>
              </>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
