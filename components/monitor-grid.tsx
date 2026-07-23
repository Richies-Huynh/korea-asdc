"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Flame, Play, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { Monitor } from "@/lib/types";
import { hasRecentAlert, isMonitorOnline, mergeActiveMonitor } from "@/lib/monitor-status";
import { useMonitor } from "@/components/monitor-provider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MonitorLiveView } from "@/components/monitor-live-view";

// A monitor plus its time-derived status. Computed in one module-scope pass so
// the components below stay pure (no clock reads during render).
interface MonitorCardModel {
  monitor: Monitor;
  online: boolean;
  alerting: boolean;
}

function toCardModels(monitors: Monitor[]): MonitorCardModel[] {
  const now = Date.now();
  return monitors.map((monitor) => ({
    monitor,
    online: isMonitorOnline(monitor, now),
    alerting: hasRecentAlert(monitor, now),
  }));
}

function MonitorCard({
  model,
  isOwn,
  onWatch,
}: {
  model: MonitorCardModel;
  isOwn: boolean;
  onWatch: () => void;
}) {
  const { monitor, online, alerting } = model;

  return (
    <button
      type="button"
      onClick={online ? onWatch : undefined}
      disabled={!online}
      className="group flex flex-col overflow-hidden rounded-xl border text-left transition-colors enabled:hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="relative flex aspect-video items-center justify-center bg-muted">
        {online ? (
          <Video className="size-8 text-muted-foreground" />
        ) : (
          <VideoOff className="size-8 text-muted-foreground" />
        )}
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <Badge variant={online ? "default" : "secondary"} className="gap-1">
            <span className={`size-1.5 rounded-full ${online ? "bg-current" : "bg-muted-foreground"}`} />
            {online ? "Online" : "Offline"}
          </Badge>
          {isOwn ? <Badge variant="outline">This Device</Badge> : null}
          {alerting ? (
            <Badge variant="destructive" className="gap-1">
              <Flame className="size-3" />
              Alert
            </Badge>
          ) : null}
        </div>
        {online ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-black">
              <Play className="size-4" />
              Watch Live
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <p className="truncate font-medium">{monitor.name}</p>
        <p className="truncate text-xs text-muted-foreground">{monitor.user.display_name}</p>
        <p className="text-xs text-muted-foreground">
          Last seen {new Date(monitor.last_seen_at).toLocaleTimeString()}
        </p>
      </div>
    </button>
  );
}

export function MonitorGrid() {
  const { status, monitor: activeMonitor } = useMonitor();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selected, setSelected] = useState<Monitor | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, Monitor.COLLECTION),
      (snapshot) => {
        const rows = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Monitor)
          .sort((first, second) => second.created_at - first.created_at);
        setMonitors(rows);
      },
      (error) => {
        // A permission-denied here means the monitors read rule has not been
        // deployed. Surface it rather than silently showing an empty grid.
        console.error("Could not load monitors", error);
        toast.error("Could not load monitors");
      },
    );
    return () => unsubscribe();
  }, []);

  // Fold in this device's own running monitor so it always appears, even if the
  // global snapshot is still empty. Deduped by id inside mergeActiveMonitor.
  const merged = mergeActiveMonitor(monitors, status === "running" ? activeMonitor : null);
  const models = toCardModels(merged);
  const online = models.filter((model) => model.online);
  const offline = models.filter((model) => !model.online);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Active Monitors ({online.length})
        </h2>
        {online.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No monitors are online right now. Open the Monitor page on a device to start one.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {online.map((model) => (
              <MonitorCard
                key={model.monitor.id}
                model={model}
                isOwn={model.monitor.id === activeMonitor?.id}
                onWatch={() => setSelected(model.monitor)}
              />
            ))}
          </div>
        )}
      </div>

      {offline.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Offline Monitors ({offline.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {offline.map((model) => (
              <MonitorCard
                key={model.monitor.id}
                model={model}
                isOwn={model.monitor.id === activeMonitor?.id}
                onWatch={() => setSelected(model.monitor)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open)
            setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              Live feed from {selected?.user.display_name}
            </DialogDescription>
          </DialogHeader>
          {selected ? <MonitorLiveView monitor={selected} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
