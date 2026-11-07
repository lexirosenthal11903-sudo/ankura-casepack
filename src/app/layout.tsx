import type { Metadata } from "next";
import Link from "next/link";
import { DEMO_TODAY } from "@/lib/demo";
import "./globals.css";
import NavLinks from "./NavLinks";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Watch it work | Harbour & Vale case pack prototype (fictional bank)",
  description: "Prototype complaint case pack for a fictional UK bank. Synthetic data only.",
};

const demoDate = new Date(`${DEMO_TODAY}T00:00:00Z`).toLocaleDateString("en-GB", {
  weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
}).replace(",", "");

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <a href="#main" className="visually-hidden skip-link">Skip to main content</a>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.brand}>
              Harbour &amp; Vale <span className={styles.brandSub}>Complaints workspace</span>
            </Link>
            <NavLinks className={styles.nav} />
          </div>
        </header>
        <div className={styles.banner} role="region" aria-label="Prototype notice">
          <div className={styles.headerInner}>
            <strong>Prototype.</strong> Fictional bank, fictional customers, synthetic data only. Demo date {demoDate}.
          </div>
        </div>
        <main id="main" className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          <div className={styles.headerInner}>
            Built by Alexandra Rosenthal for the Ankura AI by Design build task. Harbour &amp; Vale Bank does not exist.
          </div>
        </footer>
      </body>
    </html>
  );
}
