"use client";

import { ChatLayout } from "@/components/chat/ChatLayout";
import { hasPermission, useAuth } from "@/lib/auth";
import Link from "next/link";

export default function AssistantPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="text-sm text-[var(--na-muted)]">Loading…</p>;
  }

  if (!user || !hasPermission(user, "chat:use")) {
    return (
      <div className="na-card p-6">
        <p className="text-[var(--na-muted)]">You do not have access to the assistant.</p>
        <Link href="/dashboard" className="mt-2 inline-block text-sm text-[var(--na-accent)]">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--na-text)]">
          Assistant
        </h1>
        <p className="mt-1 text-sm text-[var(--na-muted)]">
          Book appointments, check inventory, and manage your organization with guided flows.
        </p>
      </div>
      <ChatLayout variant="page" />
    </div>
  );
}
