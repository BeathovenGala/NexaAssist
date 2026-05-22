import {
  ApprovalStatus,
  type Campaign,
  type CampaignApproval,
  type CampaignAsset,
  type CampaignChannel,
  type CampaignExecution,
  type CampaignMessage,
  type CampaignSchedule,
  type CampaignStatus,
  type User,
} from '@prisma/client';

type CampaignWithCreator = Campaign & {
  createdBy: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
};

type CampaignListRow = CampaignWithCreator & {
  schedules: Pick<CampaignSchedule, 'scheduledAt'>[];
  executions: Pick<CampaignExecution, 'channel'>[];
  assets: CampaignAsset[];
};

type CampaignDetailRow = CampaignWithCreator & {
  audiences: { estimatedReach: number }[];
  assets: CampaignAsset[];
  messages: CampaignMessage[];
  approvals: (CampaignApproval & {
    approvedBy: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'> | null;
  })[];
  schedules: CampaignSchedule[];
  executions: CampaignExecution[];
};

function userLabel(user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return {
    id: user.id,
    email: user.email,
    ...(name ? { name } : {}),
  };
}

function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function channelsFromExecutions(
  executions: Pick<CampaignExecution, 'channel'>[],
): CampaignChannel[] {
  return [...new Set(executions.map((e) => e.channel))];
}

function posterFromAssets(assets: CampaignAsset[]): string | null {
  const asset = assets.find((a) =>
    ['POSTER', 'BANNER', 'IMAGE'].includes(a.type),
  );
  return asset?.storageUrl ?? null;
}

function copyFromCampaign(
  messages: CampaignMessage[],
  notes: string | null,
): string | null {
  const aiMessage = messages.find((m) => m.aiGenerated);
  if (aiMessage?.body) return aiMessage.body;
  if (!notes) return null;
  const match = notes.match(/AI Copy:\n([\s\S]*)$/);
  return match?.[1]?.trim() ?? null;
}

export function mapCampaignListItem(campaign: CampaignListRow) {
  return {
    id: campaign.id,
    name: campaign.name,
    objective: campaign.objective,
    status: campaign.status as CampaignStatus,
    startDate: iso(campaign.startAt),
    endDate: iso(campaign.endAt),
    scheduledAt: iso(campaign.schedules[0]?.scheduledAt),
    channels: channelsFromExecutions(campaign.executions),
    posterUrl: posterFromAssets(campaign.assets),
    createdAt: campaign.createdAt.toISOString(),
    createdBy: { email: campaign.createdBy.email },
  };
}

export function mapCampaignDetail(campaign: CampaignDetailRow) {
  const latestApproval = campaign.approvals[0];
  const approved = campaign.approvals.find(
    (a) => a.status === ApprovalStatus.APPROVED,
  );
  const rejected = campaign.approvals.find(
    (a) => a.status === ApprovalStatus.REJECTED,
  );
  const completedExecution = campaign.executions.find((e) => e.completedAt);

  return {
    id: campaign.id,
    tenantId: campaign.tenantId,
    name: campaign.name,
    objective: campaign.objective,
    status: campaign.status,
    startDate: iso(campaign.startAt),
    endDate: iso(campaign.endAt),
    budget: campaign.budget != null ? Number(campaign.budget) : null,
    notes: campaign.notes,
    audienceType: campaign.audienceType,
    estimatedReach: campaign.audiences[0]?.estimatedReach ?? null,
    generatedCopy: copyFromCampaign(campaign.messages, campaign.notes),
    posterUrl: posterFromAssets(campaign.assets),
    channels: channelsFromExecutions(campaign.executions),
    scheduledAt: iso(campaign.schedules[0]?.scheduledAt),
    submittedAt:
      campaign.status === 'PENDING_APPROVAL' && latestApproval
        ? latestApproval.createdAt.toISOString()
        : null,
    approvedAt: approved ? approved.updatedAt.toISOString() : null,
    rejectedAt: rejected ? rejected.updatedAt.toISOString() : null,
    completedAt: iso(completedExecution?.completedAt),
    createdById: campaign.createdById,
    createdBy: userLabel(campaign.createdBy),
    approvedBy: approved?.approvedBy ? userLabel(approved.approvedBy) : null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}
