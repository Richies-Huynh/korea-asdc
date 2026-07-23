import Link from "next/link";
import { getSession } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { MonitorGrid } from "@/components/monitor-grid";
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
          <h1 className="text-2xl font-semibold">Fire Monitors</h1>
          <p className="text-sm text-muted-foreground">
            Every active monitor at a glance. Click one to watch its live feed.
          </p>
        </div>
        <Link href="/monitor" className={buttonVariants()}>
          Start a Monitor
        </Link>
      </div>
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-1">
          <MonitorGrid />
        </div>
        <div className="xl:w-80 xl:shrink-0">
          <DetectionsFeed />
        </div>
      </div>
      <ScansList user={user} />
    </div>
  );
}
