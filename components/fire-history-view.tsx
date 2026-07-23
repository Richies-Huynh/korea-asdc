"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { FIRE_EVENTS, SEVERITY_LEGEND, fireSeverityStyle } from "@/lib/fire-history";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Leaflet touches `window`, so the map only loads on the client.
const FireMap = dynamic(() => import("@/components/fire-map").then((module) => module.FireMap), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

// Most recent first, so the list reads as a timeline.
const SORTED_EVENTS = [...FIRE_EVENTS].sort((first, second) => second.occurred_at - first.occurred_at);

function formatDate(occurred_at: number) {
  return new Date(occurred_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SeverityBadge({ severity }: { severity: string }) {
  const { color, label } = fireSeverityStyle(severity);
  return (
    <Badge variant="outline">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </Badge>
  );
}

export function FireHistoryView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedEvent = FIRE_EVENTS.find((event) => event.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {SEVERITY_LEGEND.map((severity) => {
          const { color, label } = fireSeverityStyle(severity);
          return (
            <span key={severity} className="flex items-center gap-2 text-xs">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-medium">{label}</span>
            </span>
          );
        })}
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* isolate traps Leaflet's internal z-index (its panes reach ~700) so the
            portaled detail dialog renders above the map instead of behind it. */}
        <div className="isolate h-[60vh] overflow-hidden rounded-xl ring-1 ring-foreground/10 lg:h-[70vh] lg:w-3/5">
          <FireMap events={FIRE_EVENTS} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="flex flex-col gap-3 lg:w-2/5">
        {SORTED_EVENTS.map((event) => {
          const { color } = fireSeverityStyle(event.severity);
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => setSelectedId(event.id)}
              className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
            >
              <span
                className="mt-1 size-3 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.occurred_at)} &middot; {event.location_name}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={event.severity} />
                  <span className="text-xs text-muted-foreground">{event.casualties}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open)
            setSelectedId(null);
        }}
      >
        {selectedEvent ? (
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
              <DialogDescription>
                {formatDate(selectedEvent.occurred_at)} &middot; {selectedEvent.location_name}
              </DialogDescription>
            </DialogHeader>
            <SeverityBadge severity={selectedEvent.severity} />
            <div className="flex flex-col gap-4 text-sm">
              <p>{selectedEvent.summary}</p>
              <div>
                <p className="font-medium">Cause</p>
                <p className="text-muted-foreground">{selectedEvent.cause}</p>
              </div>
              <div>
                <p className="font-medium">Casualties</p>
                <p className="text-muted-foreground">{selectedEvent.casualties}</p>
              </div>
              <div>
                <p className="font-medium">Sources</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {selectedEvent.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-4 hover:text-foreground"
                      >
                        {source.title} ({source.publisher})
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
      </div>
    </div>
  );
}
