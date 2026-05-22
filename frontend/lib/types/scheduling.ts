export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW";

export type AppointmentListItem = {
  id: string;
  tenantId: string;
  appointmentCode: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  status: AppointmentStatus;
  source: string;
  notes: string | null;
  cancellationReason: string | null;
  rescheduledFromId: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string | null;
    userCode: string;
  };
  assignedStaff: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string | null;
    userCode: string;
  };
  serviceType: {
    id: string;
    name: string;
    durationMinutes: number;
    colorCode: string | null;
    isActive: boolean;
  } | null;
};

export type AppointmentHistoryEntry = {
  id: string;
  actionType: string;
  previousValue: unknown;
  newValue: unknown;
  performedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string | null;
  };
  createdAt: string;
};

export type AppointmentDetail = AppointmentListItem & {
  history: AppointmentHistoryEntry[];
};

export type ServiceType = {
  id: string;
  tenantId: string;
  name: string;
  durationMinutes: number;
  colorCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CalendarAppointmentBlock = {
  id: string;
  appointmentCode: string;
  title: string;
  status: AppointmentStatus;
  source: string;
  startTime: string;
  endTime: string;
  timezone: string;
  customer: AppointmentListItem["customer"];
  assignedStaff: AppointmentListItem["assignedStaff"];
  serviceType: AppointmentListItem["serviceType"];
};

export type CalendarPayload = {
  view: "day" | "week" | "month";
  range: { from: string; to: string };
  staffId: string | null;
  appointments: CalendarAppointmentBlock[];
  availabilitySlots: Array<{
    id: string;
    staffId: string;
    startTime: string;
    endTime: string;
    slotType: string;
  }>;
  blockedSlots: Array<{
    id: string;
    staffId: string;
    reason: string | null;
    blockedFrom: string;
    blockedTo: string;
  }>;
};

export type FreeSlot = { startTime: string; endTime: string };

/** Unified slot card for booking UI (available / booked / blocked). */
export type SlotPickerCard =
  | { kind: "available"; startTime: string; endTime: string }
  | { kind: "booked"; startTime: string; endTime: string; title?: string }
  | { kind: "blocked"; startTime: string; endTime: string; reason?: string | null };
