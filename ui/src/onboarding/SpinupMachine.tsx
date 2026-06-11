// Spin-up onboarding — the machine: gear-eye core, backdrop, gauges, telemetry.
// Ported from the Claude Design handoff (doer-brown / doer2-machine + doer2-backdrop).
import { useEffect, useState } from "react";

export function gearPath(cx: number, cy: number, rOut: number, rIn: number, teeth: number): string {
  const step = (Math.PI * 2) / teeth;
  const tip = step * 0.46;
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step, a1 = a0 + tip, a3 = a0 + step;
    const o0 = p(rOut, a0), o1 = p(rOut, a1), v1 = p(rIn, a1), v3 = p(rIn, a3);
    d += (i === 0 ? "M" : "L") + o0[0].toFixed(2) + "," + o0[1].toFixed(2);
    d += "L" + o1[0].toFixed(2) + "," + o1[1].toFixed(2);
    d += "L" + v1[0].toFixed(2) + "," + v1[1].toFixed(2);
    d += "L" + v3[0].toFixed(2) + "," + v3[1].toFixed(2);
  }
  return d + "Z";
}

const MARK_SRC = "/brands/doer-gear-eye.png";
const GEAR_SRC = "/brands/doer-gear-clean.png";

/**
 * The brand core — the REAL gear-eye mark. The plain gradient gear spins
 * continuously behind it; the eye mark itself stays upright (breathing
 * glow only) so the iris never tumbles.
 */
export function GearEyeBlue({ size = 130, igniting = false, idle = false }: {
  size?: number; igniting?: boolean; idle?: boolean;
}) {
  const ring = size * 1.22;
  return (
    <div className={"d2-core" + (igniting ? " is-igniting" : "") + (idle ? " is-idle" : "")}
      style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {!idle && (
        <img src={GEAR_SRC} alt="" aria-hidden className="d2-core-spin" draggable={false}
          style={{ position: "absolute", width: ring, height: ring, left: (size - ring) / 2, top: (size - ring) / 2, opacity: 0.28, filter: "grayscale(0.5)" }} />
      )}
      <img src={MARK_SRC} alt="Doer" className="d2-core-mark" draggable={false}
        style={{ position: "relative", width: size, height: size, objectFit: "contain" }} />
      {!idle && <div className="d2-core-glow" style={{ position: "absolute", inset: "-12%", borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(91,194,240,0.28) 0%, transparent 60%)" }} />}
    </div>
  );
}

export function DoerMark2({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <img src={MARK_SRC} alt="" width={size} height={size} draggable={false} style={{ objectFit: "contain" }} />
      <span className="d2-display" style={{ fontSize: size * 0.66, color: "var(--d2-ink)", letterSpacing: "0.06em", fontWeight: 700 }}>DOER</span>
    </div>
  );
}

/** Circular gauge with needle. */
export function Gauge({ value = 0, label = "RPM", max = 100, size = 116 }: {
  value?: number; label?: string; max?: number; size?: number;
}) {
  const a = -120 + (Math.min(value, max) / max) * 240;
  const cx = size / 2, cy = size / 2, r = size / 2 - 10;
  const arc = (from: number, to: number) => {
    const p = (deg: number) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
    const s = p(from), e = p(to);
    const large = to - from > 180 ? 1 : 0;
    return `M${s[0]!.toFixed(1)},${s[1]!.toFixed(1)} A${r} ${r} 0 ${large} 1 ${e[0]!.toFixed(1)},${e[1]!.toFixed(1)}`;
  };
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={arc(120, 420)} stroke="var(--d2-line)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d={arc(120, 120 + (Math.min(value, max) / max) * 300)} stroke="var(--d2-blue)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {Array.from({ length: 9 }).map((_, i) => {
          const deg = 120 + (i / 8) * 300;
          const p1 = [cx + (r - 2) * Math.cos(deg * Math.PI / 180), cy + (r - 2) * Math.sin(deg * Math.PI / 180)];
          const p2 = [cx + (r - 7) * Math.cos(deg * Math.PI / 180), cy + (r - 7) * Math.sin(deg * Math.PI / 180)];
          return <line key={i} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke="var(--d2-ink-faint)" strokeWidth="1" />;
        })}
        <g style={{ transform: `rotate(${a + 90}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: "transform 700ms var(--d2-spring)" }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - r + 8} stroke="var(--d2-blue-bright)" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r="4" fill="var(--d2-steel)" />
      </svg>
      <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center" }}>
        <div className="d2-mono" style={{ fontSize: 15, color: "var(--d2-ink)", fontWeight: 500 }}>{Math.round(value)}</div>
        <div className="d2-uc" style={{ fontSize: 8.5 }}>{label}</div>
      </div>
    </div>
  );
}

export function PowerBar({ level = 0, segments = 4 }: { level?: number; segments?: number }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: segments }).map((_, i) => (
        <div key={i} style={{
          width: 18, height: 7, borderRadius: 1.5,
          background: i < level ? "var(--d2-blue)" : "var(--d2-line)",
          boxShadow: i < level ? "0 0 8px var(--d2-blue)" : "none",
          transition: "background 360ms var(--d2-ease), box-shadow 360ms var(--d2-ease)",
          transitionDelay: `${i * 60}ms`,
        }} />
      ))}
    </div>
  );
}

export function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <span className="d2-uc" style={{ fontSize: 8.5 }}>{label}</span>
      <span className="d2-mono" style={{ fontSize: 12.5, color: "var(--d2-ink)", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

/** Segmented progress ring around the core. */
export function ProgressRing({ step, size = 188 }: { step: number; size?: number }) {
  const c = size / 2, r = size / 2 - 6;
  const segs = 4, gap = 9;
  const seg = 360 / segs;
  const polar = (deg: number) =>
    [c + r * Math.cos((deg - 90) * Math.PI / 180), c + r * Math.sin((deg - 90) * Math.PI / 180)];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }}>
      {Array.from({ length: segs }).map((_, i) => {
        const a0 = i * seg + gap / 2, a1 = (i + 1) * seg - gap / 2;
        const s = polar(a0), e = polar(a1);
        const lg = a1 - a0 > 180 ? 1 : 0;
        const done = i <= step;
        return <path key={i} className="d2-seg"
          d={`M${s[0]!.toFixed(1)},${s[1]!.toFixed(1)} A${r} ${r} 0 ${lg} 1 ${e[0]!.toFixed(1)},${e[1]!.toFixed(1)}`}
          stroke={done ? "var(--d2-blue)" : "var(--d2-line)"} strokeWidth={done ? 3 : 2} fill="none" strokeLinecap="round"
          style={{ filter: done ? "drop-shadow(0 0 4px var(--d2-blue))" : "none" }} />;
      })}
    </svg>
  );
}

/** Full-screen mechanical backdrop: blueprint grid + ambient wire gears + power glow. */
export function MachineBackdrop({ step, surge }: { step: number; surge: boolean }) {
  return (
    <div className={surge ? "d2-surge" : undefined} style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: "radial-gradient(120% 90% at 50% 38%, var(--d2-bg) 0%, var(--d2-bg-deep) 70%)",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(var(--d2-cyan-line) 1px, transparent 1px), linear-gradient(90deg, var(--d2-cyan-line) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        maskImage: "radial-gradient(circle at 50% 42%, #000 35%, transparent 82%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 42%, #000 35%, transparent 82%)",
        opacity: 0.6,
      }} />
      <svg style={{ position: "absolute", top: "-26%", left: "-16%", width: 620, height: 620, opacity: 0.5 }} viewBox="0 0 140 140">
        <path className="d2-bg-gear" style={{ ["--dur" as never]: "90s", transformOrigin: "70px 70px" }} d={gearPath(70, 70, 60, 46, 16)} fill="none" stroke="var(--d2-cyan-line)" strokeWidth="1.2" />
      </svg>
      <svg style={{ position: "absolute", bottom: "-30%", right: "-14%", width: 720, height: 720, opacity: 0.5 }} viewBox="0 0 140 140">
        <path className="d2-bg-gear rev" style={{ ["--dur" as never]: "120s", transformOrigin: "70px 70px" }} d={gearPath(70, 70, 60, 46, 18)} fill="none" stroke="var(--d2-cyan-line)" strokeWidth="1.2" />
      </svg>
      <svg style={{ position: "absolute", top: "8%", right: "12%", width: 240, height: 240, opacity: 0.4 }} viewBox="0 0 140 140">
        <path className="d2-bg-gear" style={{ ["--dur" as never]: "60s", transformOrigin: "70px 70px" }} d={gearPath(70, 70, 58, 46, 10)} fill="none" stroke="var(--d2-cyan-line)" strokeWidth="1.2" />
      </svg>
      <div style={{
        position: "absolute", left: "50%", top: "42%", width: 720, height: 720,
        transform: "translate(-50%,-50%)", borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(46,143,214,0.16) 0%, transparent 60%)",
        opacity: surge ? 1 : 0.3 + step * 0.14,
        transition: "opacity 700ms var(--d2-ease)",
      }} />
    </div>
  );
}

const AMBIENT_LINES = [
  "core.handshake ok",
  "telemetry stream open",
  "sandbox pool warm · 4 slots",
  "policy gate armed",
  "memory index synced",
  "adapters: claude, codex",
  "heartbeat 60s nominal",
];

/** Ambient system log (bottom-right widget). */
export function SystemLog({ surge }: { surge: boolean }) {
  const [lines, setLines] = useState<string[]>(() => AMBIENT_LINES.slice(0, 4));
  useEffect(() => {
    if (surge) return;
    const id = setInterval(() => {
      setLines((prev) => {
        const next = AMBIENT_LINES[Math.floor(Math.random() * AMBIENT_LINES.length)]!;
        return [...prev.slice(-4), next];
      });
    }, 2600);
    return () => clearInterval(id);
  }, [surge]);
  return (
    <div className="d2-widget" style={{ position: "relative", width: 240, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        <span style={{ width: 6, height: 6, borderRadius: 9, background: "var(--d2-pulse)", boxShadow: "0 0 8px var(--d2-pulse)" }} />
        <span className="d2-uc" style={{ fontSize: 9 }}>System log</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {lines.map((l, i) => (
          <div key={i + l} className="d2-mono" style={{ fontSize: 10.5, color: i === lines.length - 1 ? "var(--d2-ink-dim)" : "var(--d2-ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ color: "var(--d2-teal)" }}>›</span> {l}
          </div>
        ))}
      </div>
    </div>
  );
}
