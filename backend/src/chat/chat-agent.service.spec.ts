import { RoleName } from '@prisma/client';
import { ChatAgentService } from './chat-agent.service';

describe('ChatAgentService', () => {
  const actor = {
    id: 'u-1',
    email: 'u@test.com',
    tenantId: 't-1',
    roles: [RoleName.DOCTOR],
    permissions: ['appointments:read', 'chat:use'],
    userCode: 'DR-001',
  };

  it('executes read tool calls and returns final content', async () => {
    const openRouter = {
      isConfigured: jest.fn(() => true),
      chatCompletionWithTools: jest
        .fn()
        .mockResolvedValueOnce({
          content: '',
          toolCalls: [
            {
              id: 'call-1',
              type: 'function',
              function: {
                name: 'countAppointments',
                arguments: JSON.stringify({ date: '2026-05-18' }),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          content: 'You have 4 appointments today, including 1 pending approval.',
          toolCalls: [],
        }),
    };
    const toolExec = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        data: { total: 4, pending: 1 },
      }),
    };
    const config = { get: jest.fn().mockReturnValue('fallback') };

    const service = new ChatAgentService(openRouter as never, toolExec as never, config as never);
    const result = await service.reply({
      actor,
      tenantId: 't-1',
      sessionId: 's-1',
      userMessage: 'How many appointments today?',
      history: [],
      allowedTools: ['countAppointments'],
    });

    expect(toolExec.execute).toHaveBeenCalledWith(
      actor,
      't-1',
      's-1',
      'countAppointments',
      { date: '2026-05-18' },
    );
    expect(result.proposedTool).toBeUndefined();
    expect(result.result.content).toContain('4 appointments');
  });

  it('returns proposed confirmation for mutating tool calls', async () => {
    const openRouter = {
      isConfigured: jest.fn(() => true),
      chatCompletionWithTools: jest.fn().mockResolvedValue({
        content: '',
        toolCalls: [
          {
            id: 'call-2',
            type: 'function',
            function: {
              name: 'cancelAppointment',
              arguments: JSON.stringify({ appointmentId: 'appt-1' }),
            },
          },
        ],
      }),
    };
    const toolExec = {
      execute: jest.fn(),
    };
    const config = { get: jest.fn().mockReturnValue('fallback') };

    const service = new ChatAgentService(openRouter as never, toolExec as never, config as never);
    const result = await service.reply({
      actor,
      tenantId: 't-1',
      sessionId: 's-1',
      userMessage: 'Cancel appointment appt-1',
      history: [],
      allowedTools: ['cancelAppointment'],
    });

    expect(toolExec.execute).not.toHaveBeenCalled();
    expect(result.proposedTool).toBe('cancelAppointment');
    expect(result.proposedPayload).toEqual({ appointmentId: 'appt-1' });
    expect(result.result.metadata?.pendingConfirmation).toBe(true);
  });
});

