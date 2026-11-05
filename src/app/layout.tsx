import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Case pack | Harbour & Vale (fictional)",
  description: "Prototype complaint case pack for a fictional UK bank. Synthetic data only.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
