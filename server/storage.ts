import {
  users,
  polls,
  pollOptions,
  votes,
  voteAttempts,
  pollAuthNumbers,
  type User,
  type UpsertUser,
  type Poll,
  type InsertPoll,
  type PollOption,
  type InsertPollOption,
  type Vote,
  type InsertVote,
  type VoteAttempt,
  type InsertVoteAttempt,
  type PollAuthNumber,
  type InsertPollAuthNumber,
  type PollWithDetails,
  type PollWithResults,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, lt, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<typeof users.$inferSelect | undefined>; // Return full user with password for auth
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Password reset operations
  setResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<typeof users.$inferSelect | undefined>;
  resetPassword(userId: string, hashedPassword: string): Promise<void>;
  
  // Poll operations
  createPoll(poll: InsertPoll, options: Array<{text: string; imageUrl?: string}>): Promise<Poll>;
  getPoll(id: string): Promise<PollWithDetails | undefined>;
  getPollBySlug(slug: string): Promise<PollWithDetails | undefined>;
  getPolls(limit?: number): Promise<PollWithDetails[]>;
  getUserPolls(userId: string): Promise<PollWithDetails[]>;
  updatePoll(id: string, updates: Partial<InsertPoll>): Promise<Poll | undefined>;
  deletePoll(id: string): Promise<boolean>;
  deleteAllPolls(): Promise<number>;
  
  // Voting operations
  submitVote(vote: InsertVote): Promise<Vote>;
  updateVote(pollId: string, vote: InsertVote, userId?: string, ipAddress?: string): Promise<Vote>;
  hasUserVoted(pollId: string, userId?: string, ipAddress?: string, browserFingerprint?: string): Promise<boolean>;
  getPollResults(pollId: string): Promise<PollWithResults | undefined>;
  
  // Poll options
  getPollOptions(pollId: string): Promise<PollOption[]>;
  
  // Cleanup operations
  deleteExpiredPolls(cutoff: Date): Promise<{ pollsDeleted: number; votesDeleted: number; }>;
  
  // Subscription operations
  getUserPollCount(userId: string, month?: Date): Promise<number>;
  canCreatePoll(userId: string): Promise<{ canCreate: boolean; currentTier: string; pollCount: number; limit: number | null; }>;
  updateUserSubscription(userId: string, tier: string, startDate: Date, endDate: Date): Promise<void>;
  
  // Admin operations
  setAdminStatus(email: string, isAdmin: boolean): Promise<void>;
  
  // Rate limiting operations
  getVoteAttempt(pollId: string, ipAddress: string, hashedFingerprint?: string): Promise<VoteAttempt | undefined>;
  recordVoteAttempt(pollId: string, ipAddress: string, hashedFingerprint?: string): Promise<void>;
  incrementVoteAttempt(pollId: string, ipAddress: string, hashedFingerprint?: string): Promise<void>;
  resetVoteAttempt(pollId: string, ipAddress: string, hashedFingerprint?: string): Promise<void>;
  cleanupOldAttempts(cutoffDate: Date): Promise<number>;
  
  // Authentication number operations
  createAuthNumbers(pollId: string, start: number, end: number): Promise<void>;
  isAuthNumberAvailable(pollId: string, authNumber: number): Promise<boolean>;
  markAuthNumberUsed(pollId: string, authNumber: number, voteId: string): Promise<void>;
  getAuthNumbersReport(pollId: string): Promise<{ used: PollAuthNumber[]; unused: PollAuthNumber[]; total: number; usedCount: number; }>;
  getUsedAuthNumbers(pollId: string): Promise<number[]>;
  getUnusedAuthNumbers(pollId: string): Promise<number[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<typeof users.$inferSelect | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          // Don't update the ID - it's the primary key and referenced by foreign keys
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          password: userData.password, // Update password if provided
          updatedAt: new Date(),
        },
      })
      .returning();
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Password reset operations
  async setResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db.update(users)
      .set({ 
        resetToken: token, 
        tokenExpiry: expiry 
      })
      .where(eq(users.id, userId));
  }

  async getUserByResetToken(token: string): Promise<typeof users.$inferSelect | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.resetToken, token));
    return user;
  }

  async resetPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ 
        password: hashedPassword,
        resetToken: null,
        tokenExpiry: null
      })
      .where(eq(users.id, userId));
  }

  // Poll operations
  async createPoll(pollData: InsertPoll, options: Array<{text: string; imageUrl?: string}>): Promise<Poll> {
    return await db.transaction(async (tx) => {
      const [poll] = await tx.insert(polls).values(pollData).returning();
      
      const optionsData = options.map((option, index) => ({
        pollId: poll.id,
        text: option.text,
        imageUrl: option.imageUrl || null,
        order: index,
      }));
      
      await tx.insert(pollOptions).values(optionsData);
      
      return poll;
    });
  }

  async getPoll(id: string): Promise<PollWithDetails | undefined> {
    const result = await db
      .select({
        poll: polls,
        creator: users,
        voteCount: sql<number>`cast(count(${votes.id}) as int)`,
      })
      .from(polls)
      .leftJoin(users, eq(polls.createdById, users.id))
      .leftJoin(votes, eq(polls.id, votes.pollId))
      .where(eq(polls.id, id))
      .groupBy(polls.id, users.id);

    if (!result[0]) return undefined;

    const options = await this.getPollOptions(id);

    return {
      ...result[0].poll,
      creator: result[0].creator!,
      options,
      voteCount: result[0].voteCount || 0,
    };
  }

  async getPollBySlug(slug: string): Promise<PollWithDetails | undefined> {
    const result = await db
      .select({
        poll: polls,
        creator: users,
        voteCount: sql<number>`cast(count(${votes.id}) as int)`,
      })
      .from(polls)
      .leftJoin(users, eq(polls.createdById, users.id))
      .leftJoin(votes, eq(polls.id, votes.pollId))
      .where(eq(polls.shareableSlug, slug))
      .groupBy(polls.id, users.id);

    if (!result[0]) return undefined;

    const options = await this.getPollOptions(result[0].poll.id);

    return {
      ...result[0].poll,
      creator: result[0].creator!,
      options,
      voteCount: result[0].voteCount || 0,
    };
  }

  async getPolls(limit = 20): Promise<PollWithDetails[]> {
    const pollsResult = await db
      .select({
        poll: polls,
        creator: users,
        voteCount: sql<number>`cast(count(${votes.id}) as int)`,
      })
      .from(polls)
      .leftJoin(users, eq(polls.createdById, users.id))
      .leftJoin(votes, eq(polls.id, votes.pollId))
      .where(eq(polls.isActive, true))
      .groupBy(polls.id, users.id)
      .orderBy(desc(polls.createdAt))
      .limit(limit);

    const pollsWithOptions: PollWithDetails[] = [];
    
    for (const row of pollsResult) {
      const options = await this.getPollOptions(row.poll.id);
      pollsWithOptions.push({
        ...row.poll,
        creator: row.creator!,
        options,
        voteCount: row.voteCount || 0,
      });
    }

    return pollsWithOptions;
  }

  async getUserPolls(userId: string): Promise<PollWithDetails[]> {
    const pollsResult = await db
      .select({
        poll: polls,
        creator: users,
        voteCount: sql<number>`cast(count(${votes.id}) as int)`,
      })
      .from(polls)
      .leftJoin(users, eq(polls.createdById, users.id))
      .leftJoin(votes, eq(polls.id, votes.pollId))
      .where(eq(polls.createdById, userId))
      .groupBy(polls.id, users.id)
      .orderBy(desc(polls.createdAt));

    const pollsWithOptions: PollWithDetails[] = [];
    
    for (const row of pollsResult) {
      const options = await this.getPollOptions(row.poll.id);
      pollsWithOptions.push({
        ...row.poll,
        creator: row.creator!,
        options,
        voteCount: row.voteCount || 0,
      });
    }

    return pollsWithOptions;
  }

  async updatePoll(id: string, updates: Partial<InsertPoll>): Promise<Poll | undefined> {
    const [poll] = await db
      .update(polls)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(polls.id, id))
      .returning();
    return poll;
  }

  async deletePoll(id: string): Promise<boolean> {
    const result = await db.delete(polls).where(eq(polls.id, id));
    return (result.rowCount || 0) > 0;
  }

  async deleteAllPolls(): Promise<number> {
    const result = await db.delete(polls);
    return result.rowCount || 0;
  }

  // Voting operations
  async submitVote(voteData: InsertVote): Promise<Vote> {
    const [vote] = await db.insert(votes).values(voteData).returning();
    return vote;
  }

  async updateVote(pollId: string, voteData: InsertVote, userId?: string, ipAddress?: string): Promise<Vote> {
    let whereCondition;
    
    if (userId) {
      whereCondition = and(eq(votes.pollId, pollId), eq(votes.voterId, userId));
    } else if (ipAddress) {
      whereCondition = and(eq(votes.pollId, pollId), eq(votes.ipAddress, ipAddress));
    } else {
      throw new Error("Either userId or ipAddress must be provided");
    }

    const [updatedVote] = await db
      .update(votes)
      .set({ optionId: voteData.optionId })
      .where(whereCondition)
      .returning();
    
    if (!updatedVote) {
      throw new Error("Vote not found to update");
    }
    
    return updatedVote;
  }

  async removeUserVotes(pollId: string, userId?: string, ipAddress?: string): Promise<void> {
    let whereCondition;
    
    if (userId) {
      whereCondition = and(eq(votes.pollId, pollId), eq(votes.voterId, userId));
    } else if (ipAddress) {
      whereCondition = and(eq(votes.pollId, pollId), eq(votes.ipAddress, ipAddress));
    } else {
      throw new Error("Either userId or ipAddress must be provided");
    }

    await db.delete(votes).where(whereCondition);
  }

  async hasUserVoted(pollId: string, userId?: string, ipAddress?: string, browserFingerprint?: string): Promise<boolean> {
    if (userId) {
      // Authenticated user - check by user ID only
      const [result] = await db
        .select({ count: count() })
        .from(votes)
        .where(and(eq(votes.pollId, pollId), eq(votes.voterId, userId)));
      return result.count > 0;
    } 
    
    if (browserFingerprint) {
      // Anonymous user with fingerprint - check by fingerprint only
      // This handles mobile networks where IP changes frequently
      const [result] = await db
        .select({ count: count() })
        .from(votes)
        .where(and(
          eq(votes.pollId, pollId), 
          eq(votes.browserFingerprint, browserFingerprint)
        ));
      return result.count > 0;
    }
    
    if (ipAddress) {
      // Fallback to IP only if no fingerprint available
      const [result] = await db
        .select({ count: count() })
        .from(votes)
        .where(and(eq(votes.pollId, pollId), eq(votes.ipAddress, ipAddress)));
      return result.count > 0;
    }
    
    return false;
  }

  async getPollResults(pollId: string): Promise<PollWithResults | undefined> {
    const poll = await this.getPoll(pollId);
    if (!poll) return undefined;

    const voteResults = await db
      .select({
        optionId: pollOptions.id,
        text: pollOptions.text,
        voteCount: sql<number>`cast(count(${votes.id}) as int)`,
      })
      .from(pollOptions)
      .leftJoin(votes, eq(pollOptions.id, votes.optionId))
      .where(eq(pollOptions.pollId, pollId))
      .groupBy(pollOptions.id, pollOptions.text, pollOptions.order)
      .orderBy(pollOptions.order);

    const totalVotes = voteResults.reduce((sum, result) => sum + (result.voteCount || 0), 0);

    const results = voteResults.map(result => ({
      optionId: result.optionId,
      text: result.text,
      voteCount: result.voteCount || 0,
      percentage: totalVotes > 0 ? Math.round(((result.voteCount || 0) / totalVotes) * 100) : 0,
    }));

    return {
      ...poll,
      results,
    };
  }

  // Poll options
  async getPollOptions(pollId: string): Promise<PollOption[]> {
    return await db
      .select()
      .from(pollOptions)
      .where(eq(pollOptions.pollId, pollId))
      .orderBy(pollOptions.order);
  }

  // Cleanup operations
  async deleteExpiredPolls(cutoff: Date): Promise<{ pollsDeleted: number; votesDeleted: number; }> {
    return await db.transaction(async (tx) => {
      // First, find expired polls
      const expiredPolls = await tx
        .select({ id: polls.id })
        .from(polls)
        .where(lt(polls.endDate, cutoff));

      if (expiredPolls.length === 0) {
        return { pollsDeleted: 0, votesDeleted: 0 };
      }

      const expiredPollIds = expiredPolls.map(poll => poll.id);

      // Count votes before deletion
      const voteCountResult = await tx
        .select({ count: count() })
        .from(votes)
        .where(inArray(votes.pollId, expiredPollIds));
      
      const votesDeleted = voteCountResult[0]?.count || 0;

      // Delete votes first (due to foreign key constraints)
      await tx.delete(votes).where(inArray(votes.pollId, expiredPollIds));
      
      // Delete poll options
      await tx.delete(pollOptions).where(inArray(pollOptions.pollId, expiredPollIds));
      
      // Delete polls
      await tx.delete(polls).where(inArray(polls.id, expiredPollIds));

      return {
        pollsDeleted: expiredPolls.length,
        votesDeleted: Number(votesDeleted)
      };
    });
  }

  // Subscription operations
  async getUserPollCount(userId: string, month?: Date): Promise<number> {
    const startOfMonth = month ? new Date(month.getFullYear(), month.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = month ? new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
    
    const result = await db
      .select({ count: count() })
      .from(polls)
      .where(
        and(
          eq(polls.createdById, userId),
          sql`${polls.createdAt} >= ${startOfMonth}`,
          sql`${polls.createdAt} <= ${endOfMonth}`
        )
      );
    
    return result[0]?.count || 0;
  }

  async canCreatePoll(userId: string): Promise<{ canCreate: boolean; currentTier: string; pollCount: number; limit: number | null; }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return { canCreate: false, currentTier: "free", pollCount: 0, limit: 1 };
    }

    // Admin users have unlimited access
    if (user.isAdmin) {
      return {
        canCreate: true,
        currentTier: "admin",
        pollCount: 0,
        limit: null
      };
    }

    const currentPollCount = await this.getUserPollCount(userId);
    const tier = user.subscriptionTier || "free";
    
    // Check if subscription is active (for paid tiers)
    const now = new Date();
    const isSubscriptionActive = !user.subscriptionEndDate || user.subscriptionEndDate > now;
    
    // Define tier limits
    const tierLimits: Record<string, number | null> = {
      free: 1, // 1 poll per month
      basic: null, // unlimited
      standard: null, // unlimited  
      pro: null, // unlimited
      premium: null, // unlimited
      professional: null, // unlimited
      enterprise: null, // unlimited
      ultimate: null, // unlimited
    };

    // Get limit for tier, default to 1 for unknown tiers (but preserve null for unlimited)
    const limit = tier in tierLimits ? tierLimits[tier] : 1;
    
    // If it's a paid tier but subscription is expired, treat as free tier
    if (tier !== "free" && !isSubscriptionActive) {
      return { 
        canCreate: currentPollCount < 1, 
        currentTier: "free", 
        pollCount: currentPollCount, 
        limit: 1 
      };
    }
    
    // For free tier or active paid subscriptions
    const canCreate = limit === null || currentPollCount < limit;
    
    return { 
      canCreate, 
      currentTier: tier, 
      pollCount: currentPollCount, 
      limit 
    };
  }

  async updateUserSubscription(userId: string, tier: string, startDate: Date, endDate: Date): Promise<void> {
    await db.update(users)
      .set({
        subscriptionTier: tier,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        pollsThisMonth: 0, // Reset poll count when upgrading
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async setAdminStatus(email: string, isAdmin: boolean): Promise<void> {
    await db.update(users)
      .set({
        isAdmin,
        updatedAt: new Date()
      })
      .where(eq(users.email, email));
  }

  // Rate limiting operations
  async getVoteAttempt(pollId: string, ipAddress: string, hashedFingerprint?: string): Promise<VoteAttempt | undefined> {
    const whereCondition = hashedFingerprint
      ? and(
          eq(voteAttempts.pollId, pollId),
          eq(voteAttempts.ipAddress, ipAddress),
          eq(voteAttempts.hashedFingerprint, hashedFingerprint)
        )
      : and(
          eq(voteAttempts.pollId, pollId),
          eq(voteAttempts.ipAddress, ipAddress)
        );

    const [attempt] = await db
      .select()
      .from(voteAttempts)
      .where(whereCondition);

    return attempt;
  }

  async recordVoteAttempt(pollId: string, ipAddress: string, hashedFingerprint?: string): Promise<void> {
    const attemptData: InsertVoteAttempt = {
      pollId,
      ipAddress,
      hashedFingerprint: hashedFingerprint || '',
      attemptCount: 1,
    };

    await db
      .insert(voteAttempts)
      .values(attemptData)
      .onConflictDoNothing();
  }

  async incrementVoteAttempt(pollId: string, ipAddress: string, hashedFingerprint?: string): Promise<void> {
    const existing = await this.getVoteAttempt(pollId, ipAddress, hashedFingerprint);
    
    if (existing) {
      const whereCondition = hashedFingerprint
        ? and(
            eq(voteAttempts.pollId, pollId),
            eq(voteAttempts.ipAddress, ipAddress),
            eq(voteAttempts.hashedFingerprint, hashedFingerprint)
          )
        : and(
            eq(voteAttempts.pollId, pollId),
            eq(voteAttempts.ipAddress, ipAddress)
          );

      await db
        .update(voteAttempts)
        .set({
          attemptCount: existing.attemptCount + 1,
          lastAttemptAt: new Date(),
        })
        .where(whereCondition);
    } else {
      await this.recordVoteAttempt(pollId, ipAddress, hashedFingerprint);
    }
  }

  async resetVoteAttempt(pollId: string, ipAddress: string, hashedFingerprint?: string): Promise<void> {
    const whereCondition = hashedFingerprint
      ? and(
          eq(voteAttempts.pollId, pollId),
          eq(voteAttempts.ipAddress, ipAddress),
          eq(voteAttempts.hashedFingerprint, hashedFingerprint)
        )
      : and(
          eq(voteAttempts.pollId, pollId),
          eq(voteAttempts.ipAddress, ipAddress)
        );

    await db.delete(voteAttempts).where(whereCondition);
  }

  async cleanupOldAttempts(cutoffDate: Date): Promise<number> {
    const result = await db
      .delete(voteAttempts)
      .where(lt(voteAttempts.lastAttemptAt, cutoffDate));
    
    return result.rowCount || 0;
  }

  // Authentication number operations
  async createAuthNumbers(pollId: string, start: number, end: number): Promise<void> {
    const authNumbers: InsertPollAuthNumber[] = [];
    
    for (let num = start; num <= end; num++) {
      authNumbers.push({
        pollId,
        authNumber: num,
        isUsed: false,
      });
    }

    await db.insert(pollAuthNumbers).values(authNumbers);
  }

  async isAuthNumberAvailable(pollId: string, authNumber: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(pollAuthNumbers)
      .where(
        and(
          eq(pollAuthNumbers.pollId, pollId),
          eq(pollAuthNumbers.authNumber, authNumber),
          eq(pollAuthNumbers.isUsed, false)
        )
      );
    
    return !!result;
  }

  async markAuthNumberUsed(pollId: string, authNumber: number, voteId: string): Promise<void> {
    await db
      .update(pollAuthNumbers)
      .set({
        isUsed: true,
        usedAt: new Date(),
        usedByVoteId: voteId,
      })
      .where(
        and(
          eq(pollAuthNumbers.pollId, pollId),
          eq(pollAuthNumbers.authNumber, authNumber)
        )
      );
  }

  async getAuthNumbersReport(pollId: string): Promise<{ used: PollAuthNumber[]; unused: PollAuthNumber[]; total: number; usedCount: number; }> {
    const allNumbers = await db
      .select()
      .from(pollAuthNumbers)
      .where(eq(pollAuthNumbers.pollId, pollId))
      .orderBy(pollAuthNumbers.authNumber);

    const used = allNumbers.filter(n => n.isUsed);
    const unused = allNumbers.filter(n => !n.isUsed);

    return {
      used,
      unused,
      total: allNumbers.length,
      usedCount: used.length,
    };
  }

  async getUsedAuthNumbers(pollId: string): Promise<number[]> {
    const used = await db
      .select({ authNumber: pollAuthNumbers.authNumber })
      .from(pollAuthNumbers)
      .where(
        and(
          eq(pollAuthNumbers.pollId, pollId),
          eq(pollAuthNumbers.isUsed, true)
        )
      )
      .orderBy(pollAuthNumbers.authNumber);

    return used.map(n => n.authNumber);
  }

  async getUnusedAuthNumbers(pollId: string): Promise<number[]> {
    const unused = await db
      .select({ authNumber: pollAuthNumbers.authNumber })
      .from(pollAuthNumbers)
      .where(
        and(
          eq(pollAuthNumbers.pollId, pollId),
          eq(pollAuthNumbers.isUsed, false)
        )
      )
      .orderBy(pollAuthNumbers.authNumber);

    return unused.map(n => n.authNumber);
  }
}

export const storage = new DatabaseStorage();
