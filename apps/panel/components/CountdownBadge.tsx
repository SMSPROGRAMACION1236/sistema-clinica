"use client";

import { useEffect, useState } from "react";

function format(ms: number): { label: string; pct: number } {
  if (ms <= 0) return { label: "Vencido", pct: 0 };
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const pct = Math.max(0, Math.min(100, Math.round((ms / (24 * 60 * 60 * 1000)) * 100)));
  return { label: `${hours} h ${minutes} m`, pct };
}

export function CountdownBadge({ windowExpiresAt }: { windowExpiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = new Date(windowExpiresAt).getTime() - now;
  const { label, pct } = format(remainingMs);
  const urgent = remainingMs < 6 * 60 * 60 * 1000;

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-ink-muted">
        <span>Ventana de 24 h</span>
        <span className={`font-semibold ${urgent ? "text-status-warning" : "text-status-good"}`}>{label}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-page">
        <div
          className={`h-full rounded-full ${urgent ? "bg-status-warning" : "bg-status-good"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
