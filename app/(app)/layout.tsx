import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame } from "lucide-react";
import { getSession } from "@/lib/auth";
import { MonitorProvider } from "@/components/monitor-provider";
import { MainNav } from "@/components/main-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user)
    redirect("/sign-in");

  return (
    <MonitorProvider>
      <div className="flex min-h-full flex-col">
        <header className="relative border-b">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Flame className="size-5 text-red-500" />
              Firewatch
            </Link>
            <MainNav displayName={user.display_name} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </div>
    </MonitorProvider>
  );
}
