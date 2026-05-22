"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import { useToastStore } from "@/lib/store/toast";

type QueueStat = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

type FailedJob = {
  id: string;
  name: string;
  queue: string;
  failedReason?: string;
  attemptsMade?: number;
  timestamp?: number;
};

export default function OperationsPage() {
  const toast = useToastStore();
  const [health, setHealth] = useState<{
    workerOnline: boolean;
    workerHeartbeat: string | null;
    queues: QueueStat[];
  } | null>(null);
  const [failed, setFailed] = useState<{ queue: string; items: FailedJob[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, f] = await Promise.all([
        apiGet<{
          workerOnline: boolean;
          workerHeartbeat: string | null;
          queues: QueueStat[];
        }>("/operations/health"),
        apiGet<{ queues: { queue: string; items: FailedJob[] }[] }>(
          "/operations/jobs/failed?take=8",
        ),
      ]);
      setHealth(h);
      setFailed(f.queues);
    } catch (e) {
      toast.show(apiErrorMessage(e, "Failed to load operations data"), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function retry(queue: string, jobId: string) {
    try {
      await apiPost(`/operations/queues/${queue}/jobs/${jobId}/retry`, {});
      toast.show("Job retry queued", "info");
      void load();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Retry failed"), "error");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Operations
        </h1>
        <p className="mt-2 text-sm text-[var(--na-muted)]">
          Queue health, worker status, and failed job recovery.
        </p>
      </div>

      {loading && !health ? (
        <p className="text-sm text-[var(--na-muted)]">Loading…</p>
      ) : null}

      {health ? (
        <>
          <section className="na-card border border-[var(--na-border-subtle)] p-5">
            <h2 className="text-sm font-bold uppercase text-[var(--na-muted)]">Worker</h2>
            <p className="mt-2 text-sm text-[var(--na-text)]">
              Status:{" "}
              <span
                className={
                  health.workerOnline ? "text-emerald-300" : "text-amber-300"
                }
              >
                {health.workerOnline ? "Online" : "Offline — start npm run start:worker"}
              </span>
            </p>
            {health.workerHeartbeat ? (
              <p className="mt-1 text-xs text-[var(--na-muted)]">
                Last heartbeat: {new Date(health.workerHeartbeat).toLocaleString()}
              </p>
            ) : null}
          </section>

          <section className="na-card border border-[var(--na-border-subtle)] p-5">
            <h2 className="text-sm font-bold uppercase text-[var(--na-muted)]">Queues</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {health.queues.map((q) => (
                <div
                  key={q.name}
                  className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)]/50 p-4"
                >
                  <p className="font-mono text-sm font-semibold text-[var(--na-text)]">
                    {q.name}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-[var(--na-muted)]">
                    <dt>Waiting</dt>
                    <dd className="text-[var(--na-text)]">{q.waiting}</dd>
                    <dt>Active</dt>
                    <dd className="text-[var(--na-text)]">{q.active}</dd>
                    <dt>Failed</dt>
                    <dd className={q.failed > 0 ? "text-rose-300" : "text-[var(--na-text)]"}>
                      {q.failed}
                    </dd>
                    <dt>Delayed</dt>
                    <dd className="text-[var(--na-text)]">{q.delayed}</dd>
                  </dl>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase text-[var(--na-muted)]">Failed jobs</h2>
        {failed.every((q) => q.items.length === 0) ? (
          <p className="text-sm text-[var(--na-muted)]">No failed jobs.</p>
        ) : (
          failed.map((group) =>
            group.items.length === 0 ? null : (
              <div key={group.queue} className="space-y-2">
                <h3 className="font-mono text-xs text-[var(--na-accent)]">{group.queue}</h3>
                <ul className="space-y-2">
                  {group.items.map((job) => (
                    <li
                      key={job.id}
                      className="na-card flex flex-wrap items-start justify-between gap-3 border border-rose-500/20 p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-[var(--na-muted)]">
                          {job.id} · {job.name}
                        </p>
                        <p className="mt-1 text-sm text-rose-200">
                          {job.failedReason ?? "Unknown error"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="na-btn-secondary shrink-0 px-3 py-1.5 text-xs"
                        onClick={() => void retry(group.queue, String(job.id))}
                      >
                        Retry
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )
        )}
      </section>

      <button
        type="button"
        className="na-btn-secondary px-4 py-2 text-sm"
        onClick={() => void load()}
        disabled={loading}
      >
        Refresh
      </button>
    </div>
  );
}
