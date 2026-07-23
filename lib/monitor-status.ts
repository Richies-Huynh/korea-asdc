import { Monitor } from "@/lib/types";

// A monitor is only considered online if it reported an online status and a
// heartbeat within this window. The monitor heartbeats every 30s, so a full
// minute of silence marks it offline.
export const MONITOR_ONLINE_WINDOW_MS = 60000;

// A fire alert is flagged on the grid for this long after it fired.
export const MONITOR_ALERT_WINDOW_MS = 300000;

export function isMonitorOnline(monitor: Monitor, now: number): boolean {
  return monitor.status === Monitor.STATUS_ONLINE && now - monitor.last_seen_at < MONITOR_ONLINE_WINDOW_MS;
}

export function hasRecentAlert(monitor: Monitor, now: number): boolean {
  return monitor.last_alert_at !== null && now - monitor.last_alert_at < MONITOR_ALERT_WINDOW_MS;
}

// Ensure the operator's own running monitor shows in the grid even before the
// Firestore snapshot round-trips (or if a rules error keeps the global read
// empty), deduped by id so it never appears twice once the snapshot includes it.
export function mergeActiveMonitor(rows: Monitor[], active: Monitor | null): Monitor[] {
  if (!active || rows.some((monitor) => monitor.id === active.id))
    return rows;
  return [active, ...rows];
}
