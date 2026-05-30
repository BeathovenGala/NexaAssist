"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Link as LinkIcon, Zap, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrbitRobotCore } from "@/components/ui/orbit-robot-core";
import { SPLINE_ORBIT_SCENE } from "@/components/landing/copy";

export interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: LucideIcon;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
  centerScene?: string;
}

/** ~60s per revolution — matches Features.txt (0.3° / 50ms) */
const ORBIT_PERIOD_MS = 60000;
const DEG_PER_MS = 360 / ORBIT_PERIOD_MS;

function depthOpacityFromAngle(deg: number): number {
  const radian = (deg * Math.PI) / 180;
  return Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2)));
}

export function RadialOrbitalTimeline({
  timelineData,
  centerScene = SPLINE_ORBIT_SCENE,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [orbitRadius, setOrbitRadius] = useState(360);
  const [hubSize, setHubSize] = useState(380);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodesLayerRef = useRef<HTMLDivElement>(null);
  const nodeShellRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const rotationRef = useRef(0);
  const autoRotateRef = useRef(autoRotate);
  const expandedRef = useRef(expandedItems);
  const timelineRef = useRef(timelineData);
  const orbitRadiusRef = useRef(orbitRadius);
  const rafRef = useRef<number | null>(null);

  autoRotateRef.current = autoRotate;
  expandedRef.current = expandedItems;
  timelineRef.current = timelineData;
  orbitRadiusRef.current = orbitRadius;

  const layoutNodes = useCallback((rotationDeg: number) => {
    const data = timelineRef.current;
    const total = data.length;
    if (total === 0) return;

    const radius = orbitRadiusRef.current;
    const stepDeg = 360 / total;
    const expanded = expandedRef.current;

    data.forEach((item, index) => {
      const el = nodeShellRefs.current[item.id];
      if (!el) return;

      const angle = (index * stepDeg + rotationDeg) % 360;
      const radian = (angle * Math.PI) / 180;
      const x = radius * Math.cos(radian);
      const y = radius * Math.sin(radian);
      const zIndex = expanded[item.id] ? 300 : Math.round(100 + 50 * Math.cos(radian));

      el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      el.style.zIndex = String(zIndex);
      el.style.opacity = expanded[item.id] ? "1" : String(depthOpacityFromAngle(angle));
    });
  }, []);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target === containerRef.current ||
      target === orbitRef.current ||
      target === nodesLayerRef.current
    ) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const getRelatedItems = (itemId: number): number[] => {
    const item = timelineData.find((i) => i.id === itemId);
    return item ? item.relatedIds : [];
  };

  const centerViewOnNode = (nodeId: number) => {
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const total = timelineData.length;
    if (nodeIndex < 0 || total === 0) return;
    rotationRef.current = 270 - (nodeIndex / total) * 360;
    layoutNodes(rotationRef.current);
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (parseInt(key, 10) !== id) next[parseInt(key, 10)] = false;
      });
      next[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);
        const related: Record<number, boolean> = {};
        getRelatedItems(id).forEach((rid) => {
          related[rid] = true;
        });
        setPulseEffect(related);
        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
        layoutNodes(rotationRef.current);
      }
      return next;
    });
  };

  useEffect(() => {
    setMounted(true);
    const updateRadius = () => {
      const w = window.innerWidth;
      setOrbitRadius(w < 640 ? 190 : w < 1024 ? 270 : 360);
      setHubSize(w < 640 ? 220 : w < 1024 ? 300 : 380);
    };
    updateRadius();
    window.addEventListener("resize", updateRadius);
    return () => window.removeEventListener("resize", updateRadius);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    layoutNodes(rotationRef.current);
  }, [mounted, orbitRadius, timelineData.length, layoutNodes]);

  useEffect(() => {
    layoutNodes(rotationRef.current);
  }, [expandedItems, layoutNodes]);

  useEffect(() => {
    if (!mounted) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      layoutNodes(rotationRef.current);
      return;
    }

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;

      if (autoRotateRef.current) {
        rotationRef.current = (rotationRef.current + DEG_PER_MS * dt) % 360;
      }

      layoutNodes(rotationRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, layoutNodes]);

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-white bg-[var(--mk-ink)] border-white";
      case "in-progress":
        return "text-[var(--mk-ink)] bg-white border-[var(--mk-ink)]";
      case "pending":
        return "text-white bg-black/40 border-white/50";
      default:
        return "text-white bg-black/40 border-white/50";
    }
  };

  const totalNodes = timelineData.length;
  const ringSize = orbitRadius * 2;
  const innerRingSize = ringSize * 0.88;
  const outerRingSize = ringSize * 1.1;

  return (
    <div
      ref={containerRef}
      className="flex h-[min(100vh,920px)] min-h-[min(100vh,920px)] w-full flex-col items-center justify-center overflow-visible bg-black py-12"
      onClick={handleContainerClick}
    >
      <div className="relative flex h-full w-full max-w-7xl items-center justify-center">
        <div
          ref={orbitRef}
          className="absolute flex h-full w-full items-center justify-center"
          style={{ perspective: "1000px" }}
        >
          <div
            className="pointer-events-none absolute rounded-full border border-white/[0.06]"
            style={{ width: outerRingSize, height: outerRingSize }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute rounded-full border border-white/10"
            style={{ width: ringSize, height: ringSize }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute rounded-full border border-white/[0.07]"
            style={{ width: innerRingSize, height: innerRingSize }}
            aria-hidden
          />

          <OrbitRobotCore scene={centerScene} size={hubSize} />

          {mounted && totalNodes > 0 && (
            <div
              ref={nodesLayerRef}
              className="absolute inset-0"
              style={{ pointerEvents: "none" }}
            >
              {timelineData.map((item) => {
                const isExpanded = expandedItems[item.id];
                const isRelated =
                  activeNodeId !== null && getRelatedItems(activeNodeId).includes(item.id);
                const isPulsing = pulseEffect[item.id];
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      nodeShellRefs.current[item.id] = el;
                    }}
                    className="absolute top-1/2 left-1/2 cursor-pointer will-change-[transform,opacity]"
                    style={{
                      pointerEvents: "auto",
                      transform: "translate(-50%, -50%)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(item.id);
                    }}
                  >
                    <div className="relative">
                      <div
                        className={`absolute -inset-1 rounded-full ${isPulsing ? "animate-pulse duration-1000" : ""}`}
                        style={{
                          background:
                            "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)",
                          width: `${item.energy * 0.5 + 40}px`,
                          height: `${item.energy * 0.5 + 40}px`,
                          left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                          top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                        }}
                      />
                      <div
                        className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-[transform,box-shadow,background-color] duration-300 md:h-16 md:w-16 ${
                          isExpanded
                            ? "scale-[1.65] border-white bg-white text-[var(--mk-ink)] shadow-lg shadow-white/30"
                            : isRelated
                              ? "animate-pulse border-white bg-white/50 text-[var(--mk-ink)]"
                              : "border-white/40 bg-black text-white"
                        }`}
                      >
                        <Icon size={26} />
                      </div>
                      <div
                        className={`absolute top-16 left-1/2 -translate-x-1/2 text-sm font-semibold tracking-wider whitespace-nowrap md:top-[4.25rem] ${
                          isExpanded ? "scale-125 text-white" : "text-white/70"
                        }`}
                      >
                        {item.title}
                      </div>

                      {isExpanded && (
                        <Card
                          className="pointer-events-auto absolute top-[4.5rem] left-1/2 z-[400] w-72 -translate-x-1/2 overflow-visible border-white/30 bg-black/95 text-white shadow-xl shadow-white/10 backdrop-blur-lg sm:top-20 sm:w-80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-white/50" />
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <Badge className={`px-2 text-xs ${getStatusStyles(item.status)}`}>
                                {item.status === "completed"
                                  ? "LIVE"
                                  : item.status === "in-progress"
                                    ? "ACTIVE"
                                    : "PLANNED"}
                              </Badge>
                              <span className="font-mono text-xs text-white/50">{item.date}</span>
                            </div>
                            <CardTitle className="mt-2 text-base text-white">{item.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-white/80">
                            <p>{item.content}</p>
                            <div className="mt-4 border-t border-white/10 pt-3">
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="flex items-center">
                                  <Zap size={10} className="mr-1" />
                                  Coverage
                                </span>
                                <span className="font-mono">{item.energy}%</span>
                              </div>
                              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full bg-gradient-to-r from-neutral-400 to-white"
                                  style={{ width: `${item.energy}%` }}
                                />
                              </div>
                            </div>
                            {item.relatedIds.length > 0 && (
                              <div className="mt-4 border-t border-white/10 pt-3">
                                <div className="mb-2 flex items-center">
                                  <LinkIcon size={10} className="mr-1 text-white/70" />
                                  <h4 className="text-xs font-medium tracking-wider text-white/70 uppercase">
                                    Related
                                  </h4>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {item.relatedIds.map((relatedId) => {
                                    const relatedItem = timelineData.find((i) => i.id === relatedId);
                                    return (
                                      <Button
                                        key={relatedId}
                                        variant="outline"
                                        size="sm"
                                        className="h-6 rounded-none border-white/20 bg-transparent px-2 py-0 text-xs text-white/80 hover:bg-white/10 hover:text-white"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleItem(relatedId);
                                        }}
                                      >
                                        {relatedItem?.title}
                                        <ArrowRight size={8} className="ml-1 text-white/60" />
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
