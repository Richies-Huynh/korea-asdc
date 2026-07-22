import { MonitorView } from "@/components/monitor-view";

export default function MonitorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Fire Monitor</h1>
        <p className="text-sm text-muted-foreground">
          This device streams its camera and watches for fire. Keep this tab open while monitoring.
        </p>
      </div>
      <MonitorView />
    </div>
  );
}
