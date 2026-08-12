import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MonoLog | Personal Collection OS",
  description: "自分のコレクションを静かに整える、個人向けコレクションOS。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
