"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Walkthrough" },
  { href: "/queue", label: "All complaints" },
  { href: "/team", label: "Team leader view" },
  { href: "/how-it-works", label: "How this works" },
];

export default function NavLinks({ className }: { className?: string }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || (href === "/queue" && path.startsWith("/case/")));
  return (
    <nav aria-label="Main" className={className}>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
