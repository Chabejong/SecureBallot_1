import {
  users,
  polls,
  pollOptions,
  votes,
  type User,
  type UpsertUser,
  type Poll,
  type InsertPoll,
  type PollOption,
  type InsertPollOption,
  type Vote,
  type InsertVote,
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
    let whereCondition;
    
    if (userId) {
      // Authenticated user - check by user ID
      whereCondition = and(eq(votes.pollId, pollId), eq(votes.voterId, userId));
    } else if (browserFingerprint && ipAddress) {
      // Anonymous user - check by both IP and browser fingerprint for more reliable detection
      whereCondition = and(
        eq(votes.pollId, pollId), 
        eq(votes.ipAddress, ipAddress),
        eq(votes.browserFingerprint, browserFingerprint)
      );
    } else if (ipAddress) {
      // Fallback to IP only if no fingerprint available
      whereCondition = and(eq(votes.pollId, pollId), eq(votes.ipAddress, ipAddress));
    } else {
      return false;
    }

    const [result] = await db
      .select({ count: count() })
      .from(votes)
      .where(whereCondition);

    return result.count > 0;
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
}

export const storage = new DatabaseStorage();
