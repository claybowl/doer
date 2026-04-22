import * as React from "react";

/* ============================================================
   Fernweh primitives — TypeScript port of components.jsx.
   No external icon libs; SVG paths inline.
============================================================ */

// ---------- Icon ----------
export function Icon({
  d,
  size = 16,
  stroke = 1.5,
  className,
  style,
}: {
  d: string;
  size?: number;
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      <path d={d} />
    </svg>
  );
}

export const I = {
  home: "M3 11l9-8 9 8M5 10v10h14V10",
  org: "M12 3v6M5 21V14a3 3 0 013-3h8a3 3 0 013 3v7",
  agents: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z",
  activity: "M3 12h4l3-9 4 18 3-9h4",
  issues: "M9 11h6M9 15h6M5 7h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z M8 3v4 M16 3v4",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14M13 5l7 7-7 7",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  check: "M20 6L9 17l-5-5",
  clock: "M12 6v6l4 2 M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  sun: "M12 2v2 M12 20v2 M5 5l1.5 1.5 M17.5 17.5L19 19 M2 12h2 M20 12h2 M5 19l1.5-1.5 M17.5 6.5L19 5 M12 7a5 5 0 100 10 5 5 0 000-10z",
  moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  sliders: "M4 21V14 M4 10V3 M12 21V12 M12 8V3 M20 21V16 M20 12V3 M1 14h6 M9 8h6 M17 16h6",
  bolt: "M13 2L3 14h7v8l10-12h-7V2z",
  chevron: "M9 18l6-6-6-6",
  dot3: "M5 12h.01 M12 12h.01 M19 12h.01",
  stack: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
};

// ---------- StatusDot ----------
export type FwStatus = "running" | "idle" | "paused" | "error";

const STATUS_COLOR: Record<FwStatus, string> = {
  running: "var(--pulse)",
  idle: "var(--warn)",
  paused: "var(--ink-faint)",
  error: "var(--danger)",
};

export function StatusDot({ status, size = 8 }: { status: FwStatus; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: STATUS_COLOR[status] ?? "var(--ink-faint)",
        display: "inline-block",
        animation: status === "running" ? "fw-pulse 1.6s var(--fw-ease) infinite" : undefined,
        color: STATUS_COLOR[status] ?? "var(--ink-faint)",
      }}
    />
  );
}

// ---------- Avatar ----------
const HUE_BY_LETTER: Record<string, number> = {
  A: 30, B: 60, C: 90, D: 120, E: 150, F: 180, G: 210, H: 240,
  I: 270, J: 300, K: 330, L: 0, M: 30, N: 60, O: 90, P: 120,
  Q: 150, R: 180, S: 210, T: 240, U: 270, V: 300, W: 330, X: 0,
  Y: 30, Z: 60,
};

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const letter = (name?.[0] ?? "?").toUpperCase();
  const hue = HUE_BY_LETTER[letter] ?? 200;
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: `oklch(0.85 0.05 ${hue})`,
        color: `oklch(0.30 0.10 ${hue})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(10, size * 0.42),
        fontWeight: 600,
        fontFamily: "var(--fw-font-mono)",
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

// ---------- HeartbeatRibbon (EKG waveform) ----------
export type HeartbeatAmp = "idle" | "tick" | "work" | "output";

const AMP_HEIGHT: Record<HeartbeatAmp, number> = {
  idle: 1,
  tick: 4,
  work: 8,
  output: 12,
};

export function HeartbeatRibbon({
  beats,
  width = 120,
  height = 18,
}: {
  beats?: HeartbeatAmp[];
  width?: number;
  height?: number;
}) {
  const data = beats && beats.length > 0 ? beats : Array.from({ length: 24 }, () => "idle" as HeartbeatAmp);
  const step = width / data.length;
  const mid = height / 2;

  const points = data
    .map((b, i) => {
      const x = i * step;
      const y = mid - AMP_HEIGHT[b] * 0.5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--pulse)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  );
}

// ---------- WorkStack ----------
export function WorkStack({ count }: { count: number }) {
  const visible = Math.min(count, 4);
  return (
    <div
      style={{
        position: "relative",
        width: 28,
        height: 18,
      }}
    >
      {Array.from({ length: visible }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: i * 3,
            top: i * 1.5,
            width: 18,
            height: 12,
            background: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            borderRadius: 2,
            opacity: 0.5 + i * 0.15,
            animation: `fw-stack-pop .35s var(--fw-ease-spring) ${i * 0.05}s both`,
          }}
        />
      ))}
      {count > 4 ? (
        <span
          style={{
            position: "absolute",
            right: -8,
            top: 0,
            fontSize: 10,
            color: "var(--ink-dim)",
            fontFamily: "var(--fw-font-mono)",
          }}
        >
          +{count - 4}
        </span>
      ) : null}
    </div>
  );
}

// ---------- Spark (sparkline) ----------
export function Spark({
  values,
  width = 80,
  height = 22,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (!values?.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(1, values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------- PriorityChip ----------
export function PriorityChip({ priority }: { priority: "P0" | "P1" | "P2" | "P3" | string }) {
  const color =
    priority === "P0" ? "var(--danger)" :
    priority === "P1" ? "var(--warn)" :
    priority === "P2" ? "var(--accent)" :
    "var(--ink-faint)";
  return (
    <span className="fw-chip" style={{ color, borderColor: "transparent", background: "var(--bg-sunken)" }}>
      {priority}
    </span>
  );
}

// ---------- StatusChip ----------
export function StatusChip({ status }: { status: FwStatus | string }) {
  const known = (status as FwStatus) in STATUS_COLOR;
  const color = known ? STATUS_COLOR[status as FwStatus] : "var(--ink-faint)";
  return (
    <span className="fw-chip" style={{ color }}>
      <StatusDot status={(known ? status : "idle") as FwStatus} size={6} />
      <span style={{ textTransform: "capitalize" }}>{status}</span>
    </span>
  );
}

// ---------- Tiny helpers ----------
export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(2)}`;
}
