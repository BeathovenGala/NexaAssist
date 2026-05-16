export type EmailTemplateName =
  | 'appointment-confirmation'
  | 'appointment-confirmed'
  | 'appointment-declined'
  | 'appointment-reminder'
  | 'inventory-low-stock'
  | 'inventory-request'
  | 'invite'
  | 'password-reset'
  | 'welcome';

export function renderEmailTemplate(
  template: EmailTemplateName,
  context: Record<string, unknown>,
): { subject: string; text: string; html: string } {
  switch (template) {
    case 'appointment-confirmation':
      return {
        subject: `Appointment request received — ${context.appointmentCode ?? ''}`,
        text: `Your appointment request for ${context.title} on ${context.startTime} has been submitted and is pending provider approval.`,
        html: `<p>Your appointment request for <strong>${context.title}</strong> on ${context.startTime} has been submitted and is pending provider approval.</p>`,
      };
    case 'appointment-confirmed':
      return {
        subject: `Booking confirmed — ${context.appointmentCode ?? ''}`,
        text: `Your appointment "${context.title}" on ${context.startTime} has been confirmed.`,
        html: `<p>Your appointment <strong>${context.title}</strong> on ${context.startTime} has been <strong>confirmed</strong>.</p>`,
      };
    case 'appointment-declined':
      return {
        subject: `Appointment declined — ${context.appointmentCode ?? ''}`,
        text: `Your appointment request was declined. ${context.reason ? `Reason: ${context.reason}` : ''}`,
        html: `<p>Your appointment request was <strong>declined</strong>. ${context.reason ? `<br/>Reason: ${context.reason}` : ''}</p>`,
      };
    case 'appointment-reminder':
      return {
        subject: `Reminder: upcoming appointment — ${context.appointmentCode ?? ''}`,
        text: `Reminder: "${context.title}" starts at ${context.startTime}.`,
        html: `<p>Reminder: <strong>${context.title}</strong> starts at ${context.startTime}.</p>`,
      };
    case 'inventory-low-stock':
      return {
        subject: `Low stock alert — ${context.itemName ?? 'item'}`,
        text: `Item ${context.itemName} (SKU ${context.sku}) is low on stock. Current quantity: ${context.quantity}.`,
        html: `<p>Item <strong>${context.itemName}</strong> (SKU ${context.sku}) is low on stock. Quantity: ${context.quantity}.</p>`,
      };
    case 'inventory-request':
      return {
        subject: `New inventory request — ${context.itemName ?? 'item'}`,
        text: `${context.requesterName} requested ${context.quantityRequested} units of ${context.itemName}.`,
        html: `<p><strong>${context.requesterName}</strong> requested ${context.quantityRequested} units of <strong>${context.itemName}</strong>.</p>`,
      };
    case 'invite':
      return {
        subject: 'You are invited to NexaAssist',
        text: `You have been invited. Use this link: ${context.inviteUrl ?? ''}`,
        html: `<p>You have been invited. <a href="${context.inviteUrl}">Accept invitation</a></p>`,
      };
    case 'password-reset':
      return {
        subject: 'Password reset',
        text: `Reset your password: ${context.resetUrl ?? ''}`,
        html: `<p><a href="${context.resetUrl}">Reset your password</a></p>`,
      };
    case 'welcome':
      return {
        subject: 'Welcome to NexaAssist',
        text: `Welcome, ${context.firstName ?? 'there'}!`,
        html: `<p>Welcome, <strong>${context.firstName ?? 'there'}</strong>!</p>`,
      };
    default: {
      const _exhaustive: never = template;
      return _exhaustive;
    }
  }
}
