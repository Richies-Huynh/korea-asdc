import { Hazard, Scan } from "@/lib/types";

// Severity weights for the overall risk score. Critical hazards dominate, so a
// single critical finding pushes a market into the high band.
const WEIGHTS: Record<string /* Hazard.SEVERITY_* */, number> = {
  [Hazard.SEVERITY_CRITICAL]: 10,
  [Hazard.SEVERITY_HIGH]: 6,
  [Hazard.SEVERITY_MEDIUM]: 3,
  [Hazard.SEVERITY_LOW]: 1,
};

// Derive an overall fire-proneness score (0..100) and a label from the hazards
// found during a scan. Used server-side when persisting a scan.
export function computeRisk(hazards: Hazard[]): { risk_score: number; risk_level: string } {
  const total = hazards.reduce((sum, hazard) => sum + (WEIGHTS[hazard.severity] ?? 0), 0);
  // Saturating map: ~5 weighted points reaches the top of the scale, so a
  // couple of serious hazards register as a severe market.
  const risk_score = Math.min(100, Math.round((total / 50) * 100));
  const risk_level =
    risk_score >= 70
      ? Scan.RISK_SEVERE
      : risk_score >= 45
        ? Scan.RISK_HIGH
        : risk_score >= 20
          ? Scan.RISK_MODERATE
          : Scan.RISK_LOW;
  return { risk_score, risk_level };
}
