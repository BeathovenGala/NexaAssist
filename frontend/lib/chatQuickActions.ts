import { hasPermission, isCustomerOnly, type AuthUser } from "@/lib/auth";

export type ChatQuickAction = { label: string; message: string };

export function getStarterChips(user: AuthUser | null): ChatQuickAction[] {
  if (!user) return [];
  const customer = isCustomerOnly(user);
  const out: ChatQuickAction[] = [];

  if (hasPermission(user, "appointments:create")) {
    out.push({
      label: "Book appointment",
      message: customer
        ? "I want to book an appointment"
        : "Book an appointment for tomorrow",
    });
  }
  if (hasPermission(user, "appointments:read")) {
    out.push({
      label: customer ? "My appointments" : "Today's schedule",
      message: customer
        ? "What are my upcoming appointments?"
        : "How many appointments do I have today?",
    });
  }
  if (hasPermission(user, "appointments:cancel")) {
    out.push({
      label: "Cancel appointment",
      message: "I need to cancel an appointment",
    });
  }
  if (hasPermission(user, "appointments:update")) {
    out.push({
      label: "Reschedule",
      message: "I need to reschedule an appointment",
    });
  }
  if (hasPermission(user, "inventory:read")) {
    out.push({
      label: customer ? "Check stock" : "Inventory lookup",
      message: customer
        ? "Do we have any items low on stock?"
        : "Search inventory for gloves",
    });
  }
  if (hasPermission(user, "invitations:create")) {
    out.push({
      label: "Invite user",
      message: "I want to invite a new team member",
    });
  }
  return out;
}
