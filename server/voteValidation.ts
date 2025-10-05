import crypto from 'crypto';
import type { InsertVoteAttempt, VoteAttempt } from '@shared/schema';

const VOTE_TOKEN_SECRET = process.env.VOTE_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

export interface VoteToken {
  pollId: string;
  fingerprint: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

export function hashFingerprint(fingerprint: string): string {
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

export function generateServerVoteToken(pollId: string, fingerprint: string): VoteToken {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const dataToSign = `${pollId}:${fingerprint}:${timestamp}:${nonce}`;
  const signature = crypto.createHmac('sha256', VOTE_TOKEN_SECRET).update(dataToSign).digest('hex');

  return {
    pollId,
    fingerprint,
    timestamp,
    nonce,
    signature,
  };
}

export function validateVoteToken(token: VoteToken): { valid: boolean; reason?: string } {
  const maxAge = 5 * 60 * 1000;
  
  if (Date.now() - token.timestamp > maxAge) {
    return { valid: false, reason: 'Token expired' };
  }

  const dataToSign = `${token.pollId}:${token.fingerprint}:${token.timestamp}:${token.nonce}`;
  const expectedSignature = crypto.createHmac('sha256', VOTE_TOKEN_SECRET).update(dataToSign).digest('hex');

  if (expectedSignature !== token.signature) {
    return { valid: false, reason: 'Invalid signature' };
  }

  return { valid: true };
}

export function serializeVoteToken(token: VoteToken): string {
  return Buffer.from(JSON.stringify(token)).toString('base64');
}

export function deserializeVoteToken(serialized: string): VoteToken | null {
  try {
    return JSON.parse(Buffer.from(serialized, 'base64').toString('utf-8'));
  } catch (e) {
    return null;
  }
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  suspiciousThreshold: number;
}

export const defaultRateLimitConfig: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  suspiciousThreshold: 3,
};

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  attemptsRemaining?: number;
  resetAt?: Date;
  isSuspicious?: boolean;
}

export function checkRateLimit(
  attempts: VoteAttempt | null,
  config: RateLimitConfig = defaultRateLimitConfig
): RateLimitResult {
  if (!attempts || !attempts.lastAttemptAt) {
    return { allowed: true, attemptsRemaining: config.maxAttempts };
  }

  const now = Date.now();
  const lastAttemptTime = new Date(attempts.lastAttemptAt).getTime();
  const timeSinceLastAttempt = now - lastAttemptTime;

  if (timeSinceLastAttempt > config.windowMs) {
    return { allowed: true, attemptsRemaining: config.maxAttempts };
  }

  if (attempts.attemptCount >= config.maxAttempts) {
    const resetAt = new Date(lastAttemptTime + config.windowMs);
    return {
      allowed: false,
      reason: 'Too many voting attempts. Please try again later.',
      resetAt,
      attemptsRemaining: 0,
    };
  }

  const isSuspicious = attempts.attemptCount >= config.suspiciousThreshold;
  const attemptsRemaining = config.maxAttempts - attempts.attemptCount;

  return {
    allowed: true,
    attemptsRemaining,
    isSuspicious,
  };
}

export interface BehavioralValidationResult {
  valid: boolean;
  reason?: string;
  suspiciousScore: number;
}

export function validateBehavior(timeOnPage?: number): BehavioralValidationResult {
  let suspiciousScore = 0;

  if (timeOnPage === undefined || timeOnPage === null) {
    return {
      valid: true,
      suspiciousScore: 0.5,
    };
  }

  if (timeOnPage < 2) {
    suspiciousScore += 0.8;
  } else if (timeOnPage < 5) {
    suspiciousScore += 0.3;
  }

  if (timeOnPage > 3600) {
    suspiciousScore += 0.2;
  }

  return {
    valid: suspiciousScore < 1.0,
    suspiciousScore,
    reason: suspiciousScore >= 1.0 ? 'Suspicious voting behavior detected' : undefined,
  };
}

export interface TimingRestriction {
  minTimeBetweenVotes: number;
  minTimeOnPage: number;
}

export const defaultTimingRestriction: TimingRestriction = {
  minTimeBetweenVotes: 1000,
  minTimeOnPage: 2000,
};

export function validateTiming(
  timeOnPage: number | undefined,
  lastVoteTime: Date | null,
  config: TimingRestriction = defaultTimingRestriction
): { valid: boolean; reason?: string } {
  if (timeOnPage !== undefined && timeOnPage < config.minTimeOnPage) {
    return {
      valid: false,
      reason: 'Please take a moment to review the poll options before voting',
    };
  }

  if (lastVoteTime) {
    const timeSinceLastVote = Date.now() - new Date(lastVoteTime).getTime();
    if (timeSinceLastVote < config.minTimeBetweenVotes) {
      return {
        valid: false,
        reason: 'Please wait a moment before voting again',
      };
    }
  }

  return { valid: true };
}
