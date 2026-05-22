"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { screenStates } from "../copy";
import { prefersReducedMotion } from "@/lib/landing/motion";

const CYCLE_MS = 4000;

/** Mini NexaAssist dashboard rendered inside the 3D monitor. */
export function MonitorScreen() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [secondaryIndex, setSecondaryIndex] = useState(3);

  useEffect(() => {
    const step = CYCLE_MS / screenStates.length;
    const id = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % screenStates.length);
      setSecondaryIndex((i) => (i + 2) % screenStates.length);
    }, step);
    return () => window.clearInterval(id);
  }, []);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".na-monitor-panel", {
        opacity: 0,
        y: 8,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        repeat: -1,
        repeatDelay: 3,
        yoyo: true,
      });
    },
    { scope: rootRef },
  );

  const primary = screenStates[lineIndex];
  const secondary = screenStates[secondaryIndex];

  return (
    <div
      ref={rootRef}
      className="na-monitor-screen relative flex h-full w-full flex-col overflow-hidden rounded-[2px] border border-[#2a3a55]/80 bg-[#080c14] p-2.5 shadow-[inset_0_0_24px_rgba(77,147,229,0.15)] sm:p-3"
    >
      <div className="na-monitor-scanlines pointer-events-none absolute inset-0" aria-hidden />
      <header className="flex shrink-0 items-center justify-between border-b border-[#2a3a55]/60 pb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: "var(--na-cyan)", boxShadow: "0 0 6px var(--na-cyan)" }}
          />
          <span className="font-mono text-[9px] font-medium text-[var(--na-cyan)] na-monitor-flicker sm:text-[10px]">
            {primary}
          </span>
        </div>
        <span className="max-w-[45%] truncate font-mono text-[8px] text-[#6b8cb8] na-monitor-flicker-delay sm:text-[9px]">
          {secondary}
        </span>
      </header>

      <div className="mt-2 grid min-h-0 flex-1 grid-cols-[52px_1fr] gap-2">
        <aside className="na-monitor-panel flex flex-col gap-1 rounded border border-[#2a3a55]/50 bg-[#0d1219] p-1.5">
          {["Dash", "Appt", "Inv", "Bot", "Camp"].map((label, i) => (
            <div
              key={label}
              className={`rounded px-1 py-1 font-mono text-[7px] sm:text-[8px] ${
                i === 0
                  ? "bg-[var(--na-accent-solid)]/35 text-[var(--na-accent)]"
                  : "text-white/35"
              }`}
            >
              {label}
            </div>
          ))}
        </aside>

        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <MetricCard label="Appointments" value="24" delta="+3" />
            <MetricCard label="Stock health" value="98%" delta="OK" />
          </div>
          <div className="na-monitor-panel min-h-0 flex-1 rounded border border-[#2a3a55]/50 bg-[#0d1219]/90 p-2">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[8px] text-[#6b8cb8]">Live queue</p>
              <span className="font-mono text-[7px] text-[var(--na-cyan)]">operational</span>
            </div>
            <div className="mt-1.5 space-y-1">
              <QueueRow time="14:30" label="Consultation · confirmed" />
              <QueueRow time="15:00" label="Low stock · review" />
              <QueueRow time="—" label="Campaign batch · queued" />
            </div>
          </div>
          <div className="na-monitor-panel flex h-10 items-end gap-0.5 rounded border border-[#2a3a55]/40 bg-[#0a0e16] px-1.5 pb-1 pt-2">
            {[40, 65, 45, 80, 55, 72, 48].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-[var(--na-accent-solid)]/50"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="na-monitor-panel rounded border border-[#2a3a55]/50 bg-[#0d1219] p-1.5">
      <p className="font-mono text-[7px] text-[#6b8cb8] sm:text-[8px]">{label}</p>
      <div className="mt-0.5 flex items-baseline justify-between gap-1">
        <p className="text-xs font-semibold text-[var(--na-accent)] sm:text-sm">{value}</p>
        <span className="font-mono text-[7px] text-[var(--na-cyan)]">{delta}</span>
      </div>
    </div>
  );
}

function QueueRow({ time, label }: { time: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded bg-[#121a28]/80 px-1.5 py-0.5">
      <span className="shrink-0 font-mono text-[7px] text-[var(--na-cyan)]">{time}</span>
      <span className="truncate font-mono text-[7px] text-white/65 sm:text-[8px]">{label}</span>
    </div>
  );
}
