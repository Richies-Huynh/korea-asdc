"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { Monitor, User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function isOnline(monitor: Monitor) {
  return monitor.status === Monitor.STATUS_ONLINE && Date.now() - monitor.last_seen_at < 60000;
}

export function MonitorsList({ user }: { user: User }) {
  const [monitors, setMonitors] = useState<Monitor[]>([]);

  useEffect(() => {
    const monitorsQuery = query(collection(db, Monitor.COLLECTION), where("user.id", "==", user.id));
    const unsubscribe = onSnapshot(monitorsQuery, (snapshot) => {
      const rows = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Monitor)
        .sort((first, second) => second.created_at - first.created_at);
      setMonitors(rows);
    });
    return () => unsubscribe();
  }, [user.id]);

  async function removeMonitor(id: string) {
    const response = await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    if (!response.ok)
      toast.error("Could not remove the monitor");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monitors</CardTitle>
        <CardDescription>Devices watching for fire.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {monitors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No monitors yet. Open the Monitor page on a device to start one.
          </p>
        ) : (
          monitors.map((monitor) => (
            <div key={monitor.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{monitor.name}</p>
                <p className="text-xs text-muted-foreground">
                  Last seen {new Date(monitor.last_seen_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isOnline(monitor) ? "default" : "secondary"}>
                  {isOnline(monitor) ? "Online" : "Offline"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="tooltip tooltip-right"
                  data-tooltip="Remove Monitor"
                  onClick={() => removeMonitor(monitor.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
