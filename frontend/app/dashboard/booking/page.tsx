"use client";

import { BookingSinglePage } from "@/components/appointments/BookingSinglePage";
import { customerNeedsTenant, useAuth } from "@/lib/auth";
import Link from "next/link";

export default function BookingPage() {
  const { user } = useAuth();
  const blocked = user && customerNeedsTenant(user);

  if (blocked) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-6 text-sm text-amber-100">
        <p className="font-medium">Organization access required</p>
        <p className="mt-2 text-[var(--na-muted)]">
          Wait for an admin to approve your join request, then return here to book.
        </p>
        <Link href="/dashboard/pending-tenant" className="mt-4 inline-block text-[var(--na-accent)]">
          View status
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Book an appointment
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--na-muted)]">
          Choose a service and provider, pick a date range, then select an open slot. Requests appear
          as pending for staff to confirm.
        </p>
      </div>
      <BookingSinglePage />
    </div>
  );
}
