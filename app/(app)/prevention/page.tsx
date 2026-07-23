import { getSession } from "@/lib/auth";
import { PreventionScanner } from "@/components/prevention-scanner";
import { ScansList } from "@/components/scans-list";

export default async function PreventionPage() {
  const user = await getSession();
  if (!user)
    return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Prevention Scan</h1>
        <p className="text-sm text-muted-foreground">
          Scan your stall for fire hazards before they start a fire. Review the highlighted warnings and fix what matters most.
        </p>
      </div>
      <PreventionScanner />
      <ScansList user={user} />
    </div>
  );
}
