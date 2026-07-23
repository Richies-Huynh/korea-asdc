"use client";

import { Flame } from "lucide-react";
import { useMonitor } from "@/components/monitor-provider";
import { Badge } from "@/components/ui/badge";

// Header pill that reassures the operator their monitor is still watching while
// they browse other pages. Hidden entirely when nothing is running.
export function MonitorStatusIndicator() {
  const { status, monitor } = useMonitor();
  if (status !== "running")
    return null;

  return (
    <Badge variant="destructive" className="gap-1">
      <Flame className="size-3" />
      Monitoring {monitor?.name}
    </Badge>
  );
}
