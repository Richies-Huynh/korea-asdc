"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { MonitorStatusIndicator } from "@/components/monitor-status-indicator";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/monitor", label: "Monitor" },
  { href: "/fire-history", label: "Fire History" },
  { href: "/prevention", label: "Prevention" },
];

// Header navigation. On desktop the links sit inline; on mobile they collapse
// behind a hamburger toggle that drops a full-width panel below the header so
// the bar never overflows a narrow viewport.
export function MainNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function linkClass(href: string) {
    return pathname === href ? "text-foreground" : "text-muted-foreground hover:text-foreground";
  }

  return (
    <>
      <nav className="hidden items-center gap-4 text-sm md:flex">
        <MonitorStatusIndicator />
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass(link.href)}>
            {link.label}
          </Link>
        ))}
        <span className="text-muted-foreground">{displayName}</span>
        <SignOutButton />
      </nav>

      <div className="flex items-center gap-2 md:hidden">
        <MonitorStatusIndicator />
        <Button
          variant="outline"
          size="icon"
          aria-label={open ? "Close Menu" : "Open Menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-full z-40 border-b bg-background shadow-sm md:hidden">
          <nav className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-3 text-sm">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-2 py-2 ${linkClass(link.href)}`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between gap-3 border-t pt-3">
              <span className="min-w-0 truncate text-muted-foreground">{displayName}</span>
              <SignOutButton />
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
