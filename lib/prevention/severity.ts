import { Hazard } from "@/lib/types";

// Single source of truth for how a hazard severity maps to UI treatment.
// globals.css has no amber/green theme tokens, so box strokes and text use raw
// Tailwind classes, matching the `text-red-500` precedent in the app layout.
type SeverityStyle = {
  label: string;
  order: number;
  badgeVariant: "destructive" | "secondary" | "outline";
  textClass: string;
  // Canvas stroke colour used when drawing the hazard box overlay.
  stroke: string;
};

const STYLES: Record<string /* Hazard.SEVERITY_* */, SeverityStyle> = {
  [Hazard.SEVERITY_CRITICAL]: {
    label: "Critical",
    order: 0,
    badgeVariant: "destructive",
    textClass: "text-red-600 dark:text-red-500",
    stroke: "#dc2626",
  },
  [Hazard.SEVERITY_HIGH]: {
    label: "High",
    order: 1,
    badgeVariant: "destructive",
    textClass: "text-amber-600 dark:text-amber-500",
    stroke: "#d97706",
  },
  [Hazard.SEVERITY_MEDIUM]: {
    label: "Medium",
    order: 2,
    badgeVariant: "secondary",
    textClass: "text-yellow-600 dark:text-yellow-500",
    stroke: "#ca8a04",
  },
  [Hazard.SEVERITY_LOW]: {
    label: "Low",
    order: 3,
    badgeVariant: "outline",
    textClass: "text-emerald-600 dark:text-emerald-500",
    stroke: "#059669",
  },
};

const FALLBACK: SeverityStyle = STYLES[Hazard.SEVERITY_LOW];

export function severityStyle(severity: string): SeverityStyle {
  return STYLES[severity] ?? FALLBACK;
}

// Severities ordered from most to least severe, for grouping in the summary.
export const SEVERITY_ORDER: string[] = [
  Hazard.SEVERITY_CRITICAL,
  Hazard.SEVERITY_HIGH,
  Hazard.SEVERITY_MEDIUM,
  Hazard.SEVERITY_LOW,
];
