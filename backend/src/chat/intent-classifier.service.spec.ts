import { ConversationWorkflow } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { IntentClassifierService } from './intent-classifier.service';
import { OpenRouterService } from './openrouter.service';

describe('IntentClassifierService', () => {
  const openRouter = {
    isConfigured: () => false,
  } as unknown as OpenRouterService;
  const config = {
    get: () => undefined,
  } as unknown as ConfigService;
  const classifier = new IntentClassifierService(openRouter, config);

  it('classifies cancel phrasing', () => {
    const out = classifier.classifyWithRules('Please cancel my visit tomorrow');
    expect(out.intent).toBe('cancel_appointment');
    expect(out.confidence).toBeGreaterThan(0.7);
  });

  it('classifies reschedule phrasing', () => {
    const out = classifier.classifyWithRules('Move my appointment to Friday');
    expect(out.intent).toBe('reschedule_appointment');
  });

  it('extracts appointment code entity', () => {
    const out = classifier.classifyWithRules('Cancel APT-ABC123');
    expect(out.intent).toBe('cancel_appointment');
    expect(out.entities.appointmentId).toBe('APT-ABC123');
  });

  it('does not switch workflow on general intent when in active flow', () => {
    const classified = classifier.classifyWithRules('ok thanks');
    expect(
      classifier.shouldSwitchWorkflow(
        ConversationWorkflow.BOOK_APPOINTMENT,
        classified,
      ),
    ).toBe(false);
  });

  it('switches workflow when intent maps to different flow', () => {
    const classified = classifier.classifyWithRules('Search inventory for gloves');
    expect(
      classifier.shouldSwitchWorkflow(
        ConversationWorkflow.BOOK_APPOINTMENT,
        classified,
      ),
    ).toBe(true);
  });
});
