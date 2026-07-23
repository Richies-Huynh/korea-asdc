import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame } from "lucide-react";
import { getSession } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user)
    redirect("/sign-in");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Flame className="size-5 text-red-500" />
            Fire Watch
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/monitor" className="text-muted-foreground hover:text-foreground">
              Monitor
            </Link>
            <Link href="/prevention" className="text-muted-foreground hover:text-foreground">
              Prevention
            </Link>
            <span className="hidden text-muted-foreground sm:inline">{user.display_name}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
