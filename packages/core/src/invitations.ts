export type TestPhase = "alpha" | "beta";

export interface TestInvitation {
  id: string;
  phase: TestPhase;
  tokenHash: string;
  createdByUserId: string;
  createdAt: string;
  expiresAt: string;
  maxRedemptions: number;
  revokedAt?: string;
}

export interface InvitationRedemption {
  id: string;
  invitationId: string;
  userId: string;
  redeemedAt: string;
}

export type InvitationDecisionReason =
  | "eligible"
  | "already_redeemed"
  | "expired"
  | "revoked"
  | "exhausted"
  | "invalid_invitation";

export interface InvitationDecision {
  allowed: boolean;
  reason: InvitationDecisionReason;
  remainingRedemptions: number;
}

/**
 * Evaluates a server-loaded invitation. Raw invitation tokens never belong in
 * this domain object and must be hashed before an adapter queries storage.
 */
export function decideInvitationRedemption(
  invitation: TestInvitation,
  redemptions: readonly InvitationRedemption[],
  userId: string,
  now = new Date(),
): InvitationDecision {
  const relatedRedemptions = redemptions.filter(
    (redemption) => redemption.invitationId === invitation.id,
  );
  const remainingRedemptions = Math.max(
    0,
    invitation.maxRedemptions - relatedRedemptions.length,
  );

  if (!isValidInvitation(invitation) || !userId.trim()) {
    return { allowed: false, reason: "invalid_invitation", remainingRedemptions };
  }

  if (relatedRedemptions.some((redemption) => redemption.userId === userId)) {
    return {
      allowed: true,
      reason: "already_redeemed",
      remainingRedemptions,
    };
  }

  if (invitation.revokedAt) {
    return { allowed: false, reason: "revoked", remainingRedemptions };
  }

  if (now.getTime() >= Date.parse(invitation.expiresAt)) {
    return { allowed: false, reason: "expired", remainingRedemptions };
  }

  if (remainingRedemptions === 0) {
    return { allowed: false, reason: "exhausted", remainingRedemptions };
  }

  return { allowed: true, reason: "eligible", remainingRedemptions };
}

function isValidInvitation(invitation: TestInvitation): boolean {
  const createdAt = Date.parse(invitation.createdAt);
  const expiresAt = Date.parse(invitation.expiresAt);
  return Boolean(
    invitation.id.trim() &&
      invitation.tokenHash.trim() &&
      invitation.createdByUserId.trim() &&
      Number.isFinite(createdAt) &&
      Number.isFinite(expiresAt) &&
      expiresAt > createdAt &&
      Number.isInteger(invitation.maxRedemptions) &&
      invitation.maxRedemptions > 0,
  );
}
