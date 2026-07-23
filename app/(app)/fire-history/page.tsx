import { getSession } from "@/lib/auth";
import { FireHistoryView } from "@/components/fire-history-view";

export default async function FireHistoryPage() {
  const user = await getSession();
  if (!user)
    return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Fire History</h1>
        <p className="text-sm text-muted-foreground">
          Real, documented fires in and around Gwangju. Select a hotspot to see what happened, what caused it, and the sources behind it.
        </p>
      </div>
      <FireHistoryView />
    </div>
  );
}
