"use client";

import { useEffect, useRef } from "react";
import { PreventionConfig } from "@/lib/constants";
import { Scan } from "@/lib/types";
import { severityStyle, SEVERITY_ORDER } from "@/lib/prevention/severity";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function riskVariant(scan: Scan): "destructive" | "secondary" | "outline" {
  if (scan.risk_level === Scan.RISK_SEVERE || scan.risk_level === Scan.RISK_HIGH)
    return "destructive";
  if (scan.risk_level === Scan.RISK_MODERATE)
    return "secondary";
  return "outline";
}

export function ScanReview({ scan }: { scan: Scan }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // Redraw the hazard boxes whose moment is near the current playback position.
  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay)
      return;

    const draw = () => {
      overlay.width = video.clientWidth;
      overlay.height = video.clientHeight;
      const context = overlay.getContext("2d");
      if (!context)
        return;
      context.clearRect(0, 0, overlay.width, overlay.height);
      const currentMs = video.currentTime * 1000;
      for (const hazard of scan.hazards) {
        if (Math.abs(hazard.time_offset - currentMs) > PreventionConfig.REVIEW_BOX_WINDOW_MS)
          continue;
        const style = severityStyle(hazard.severity);
        const x = hazard.box.x * overlay.width;
        const y = hazard.box.y * overlay.height;
        const width = hazard.box.width * overlay.width;
        const height = hazard.box.height * overlay.height;
        context.lineWidth = 2;
        context.strokeStyle = style.stroke;
        context.strokeRect(x, y, width, height);
        context.fillStyle = style.stroke;
        context.font = "12px sans-serif";
        context.fillText(hazard.label, x, Math.max(12, y - 4));
      }
    };

    video.addEventListener("timeupdate", draw);
    video.addEventListener("loadedmetadata", draw);
    return () => {
      video.removeEventListener("timeupdate", draw);
      video.removeEventListener("loadedmetadata", draw);
    };
  }, [scan.hazards]);

  function seekTo(timeOffset: number) {
    const video = videoRef.current;
    if (!video)
      return;
    video.currentTime = timeOffset / 1000;
    video.play().catch(() => {});
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex min-w-0 flex-col gap-3 lg:w-2/3">
        <Card>
          <CardContent className="p-0">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                src={`/api/scans/${scan.id}/file`}
                controls
                playsInline
                className="size-full object-contain"
              />
              <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 size-full" />
            </div>
          </CardContent>
        </Card>

        {/* Timeline with a marker per hazard, coloured by severity. Markers sit
            in a padded inner track so edge dots stay inside, and tooltips near
            the ends anchor inward so they never bleed into the summary card. */}
        <div className="w-full rounded-full bg-muted p-2">
          <div className="relative h-3 w-full">
            {scan.duration_ms > 0
              ? scan.hazards.map((hazard) => {
                  const percent = Math.min(100, Math.max(0, (hazard.time_offset / scan.duration_ms) * 100));
                  const anchor = percent < 20 ? "tooltip-left" : percent > 80 ? "tooltip-right" : "";
                  return (
                    <button
                      key={hazard.id}
                      type="button"
                      onClick={() => seekTo(hazard.time_offset)}
                      className={`tooltip ${anchor} absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white`}
                      style={{
                        left: `${percent}%`,
                        backgroundColor: severityStyle(hazard.severity).stroke,
                      }}
                      data-tooltip={hazard.label}
                    />
                  );
                })
              : null}
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:w-1/3 lg:self-start">
        <Card className="lg:max-h-[calc(100vh-3rem)]">
          <CardHeader>
            <CardTitle>Scan Summary</CardTitle>
            <CardDescription>
              What to fix, ranked by how dangerous it is. Select a hazard to jump to that moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Overall Risk</p>
                <p className="text-xs text-muted-foreground">Fire proneness score {scan.risk_score}/100</p>
              </div>
              <Badge variant={riskVariant(scan)}>{scan.risk_level}</Badge>
            </div>

            {scan.hazards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hazards were found. Keep it up.</p>
            ) : (
              SEVERITY_ORDER.map((severity) => {
                const group = scan.hazards.filter((hazard) => hazard.severity === severity);
                if (group.length === 0)
                  return null;
                const style = severityStyle(severity);
                return (
                  <div key={severity} className="flex flex-col gap-2">
                    <p className={`text-sm font-medium ${style.textClass}`}>
                      {style.label} ({group.length})
                    </p>
                    {group.map((hazard) => (
                      <div key={hazard.id} className="flex flex-col gap-1 rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 font-medium break-words">{hazard.label}</p>
                          <Badge variant={style.badgeVariant} className="shrink-0">{style.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{hazard.recommendation}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{hazard.category.replace("_", " ")}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => seekTo(hazard.time_offset)}>
                            Jump to Moment
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
