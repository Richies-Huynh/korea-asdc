import Link from "next/link";
import { getSession } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { MonitorsList } from "@/components/monitors-list";
import { DetectionsFeed } from "@/components/detections-feed";
import { ScansList } from "@/components/scans-list";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user)
    return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your fire monitors and recent detections.</p>
        </div>
        <Link href="/monitor" className={buttonVariants()}>
          Start a Monitor
        </Link>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-1/2">
          <MonitorsList user={user} />
        </div>
        <div className="lg:w-1/2">
          <DetectionsFeed user={user} />
        </div>
      </div>
      <ScansList user={user} />
    </div>
  );
}
