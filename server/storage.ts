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
import { eq, desc, and, sql, count } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Poll operations
  createPoll(poll: InsertPoll, options: Array<{text: string; imageUrl?: string}>): Promise<Poll>;
  getPoll(id: string): Promise<PollWithDetails | undefined>;
  getPolls(limit?: number): Promise<PollWithDetails[]>;
  getUserPolls(userId: string): Promise<PollWithDetails[]>;
  updatePoll(id: string, updates: Partial<InsertPoll>): Promise<Poll | undefined>;
  deletePoll(id: string): Promise<boolean>;
  deleteAllPolls(): Promise<number>;
  
  // Voting operations
  submitVote(vote: InsertVote): Promise<Vote>;
  updateVote(pollId: string, vote: InsertVote, userId?: string, ipAddress?: string): Promise<Vote>;
  hasUserVoted(pollId: string, userId?: string, ipAddress?: string): Promise<boolean>;
  getPollResults(pollId: string): Promise<PollWithResults | undefined>;
  
  // Poll options
  getPollOptions(pollId: string): Promise<PollOption[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
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

  async hasUserVoted(pollId: string, userId?: string, ipAddress?: string): Promise<boolean> {
    let whereCondition;
    
    if (userId) {
      whereCondition = and(eq(votes.pollId, pollId), eq(votes.voterId, userId));
    } else if (ipAddress) {
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
}

export const storage = new DatabaseStorage();
