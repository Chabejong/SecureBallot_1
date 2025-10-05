import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for email/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  resetToken: varchar("reset_token"),
  tokenExpiry: timestamp("token_expiry"),
  isAdmin: boolean("is_admin").notNull().default(false),
  subscriptionTier: varchar("subscription_tier", { length: 20 }).notNull().default("free"), // free, basic, standard, pro, premium, enterprise
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  pollsThisMonth: integer("polls_this_month").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment transactions audit table for security and idempotency
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  paypalOrderId: varchar("paypal_order_id").notNull().unique(), // Prevent replay attacks
  amount: varchar("amount").notNull(), // Store as string to match PayPal format
  currency: varchar("currency").notNull().default("EUR"),
  tier: varchar("tier").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  // Index for user transaction history
  userIdIndex: index("payment_transactions_user_id_idx").on(table.userId),
  // Index for order lookup
  paypalOrderIndex: index("payment_transactions_paypal_order_idx").on(table.paypalOrderId),
}));

export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  pollType: varchar("poll_type", { length: 20 }).notNull().default("public"), // public, members, invited
  isAnonymous: boolean("is_anonymous").notNull().default(true),
  allowComments: boolean("allow_comments").notNull().default(false),
  allowVoteChanges: boolean("allow_vote_changes").notNull().default(true),
  isMultipleChoice: boolean("is_multiple_choice").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isPublicShareable: boolean("is_public_shareable").notNull().default(false), // for anonymous voting via shareable links
  shareableSlug: varchar("shareable_slug", { length: 50 }).unique(), // unique identifier for shareable links
  endDate: timestamp("end_date").notNull(),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Index for getUserPolls queries
  createdByIndex: index("polls_created_by_idx").on(table.createdById),
  // Index for cleanup operations and date filtering
  endDateIndex: index("polls_end_date_idx").on(table.endDate),
  // Index for active polls queries
  isActiveIndex: index("polls_is_active_idx").on(table.isActive),
  // Composite index for user polls with date ordering
  createdByDateIndex: index("polls_created_by_date_idx").on(table.createdById, table.createdAt),
}));

export const pollOptions = pgTable("poll_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: 'cascade' }),
  text: varchar("text", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Index for loading poll options
  pollIdIndex: index("poll_options_poll_id_idx").on(table.pollId),
  // Composite index for ordered poll options
  pollIdOrderIndex: index("poll_options_poll_id_order_idx").on(table.pollId, table.order),
}));

export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: 'cascade' }),
  optionId: varchar("option_id").notNull().references(() => pollOptions.id, { onDelete: 'cascade' }),
  voterId: varchar("voter_id").references(() => users.id), // null for anonymous votes
  ipAddress: varchar("ip_address", { length: 45 }), // for tracking without user ID
  browserFingerprint: varchar("browser_fingerprint"), // for duplicate prevention in anonymous voting
  hashedFingerprint: varchar("hashed_fingerprint", { length: 64 }), // SHA-256 hash of enhanced fingerprint
  voteToken: text("vote_token"), // cryptographic token for vote validation
  timeOnPage: integer("time_on_page"), // seconds spent on page before voting (behavioral validation)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint for authenticated users - one vote per user per poll per option (allows multiple choice)
  userPollOptionUnique: uniqueIndex("votes_user_poll_option_unique").on(table.pollId, table.voterId, table.optionId).where(sql`voter_id IS NOT NULL`),
  // Unique constraint for anonymous users - one vote per IP+fingerprint per option (allows multiple choice)
  anonymousVoteUnique: uniqueIndex("votes_anonymous_unique").on(
    table.pollId, 
    sql`coalesce(${table.ipAddress}, '')`,
    sql`coalesce(${table.browserFingerprint}, '')`,
    table.optionId
  ).where(sql`voter_id IS NULL`),
  // Performance indexes
  pollIdIndex: index("votes_poll_id_idx").on(table.pollId),
  voterIdIndex: index("votes_voter_id_idx").on(table.voterId),
  optionIdIndex: index("votes_option_id_idx").on(table.optionId),
  hashedFingerprintIndex: index("votes_hashed_fingerprint_idx").on(table.hashedFingerprint),
  // Composite index for vote aggregation
  pollOptionIndex: index("votes_poll_option_idx").on(table.pollId, table.optionId),
}));

// Rate limiting table for vote attempts
export const voteAttempts = pgTable("vote_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: 'cascade' }),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  hashedFingerprint: varchar("hashed_fingerprint", { length: 64 }).notNull().default(''),
  attemptCount: integer("attempt_count").notNull().default(1),
  lastAttemptAt: timestamp("last_attempt_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Composite unique index for IP + fingerprint per poll
  ipFingerprintPollUnique: uniqueIndex("vote_attempts_unique").on(
    table.pollId,
    table.ipAddress,
    table.hashedFingerprint
  ),
  // Index for cleanup queries
  lastAttemptIndex: index("vote_attempts_last_attempt_idx").on(table.lastAttemptAt),
  // Index for poll lookups
  pollIdIndex: index("vote_attempts_poll_id_idx").on(table.pollId),
}));

// Used vote tokens table for replay protection
export const usedVoteTokens = pgTable("used_vote_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenNonce: varchar("token_nonce", { length: 32 }).notNull().unique(),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: 'cascade' }),
  usedAt: timestamp("used_at").defaultNow(),
}, (table) => ({
  // Index for nonce lookups
  nonceIndex: index("used_vote_tokens_nonce_idx").on(table.tokenNonce),
  // Index for cleanup queries
  usedAtIndex: index("used_vote_tokens_used_at_idx").on(table.usedAt),
}));

// User groups table for targeting polls to specific user segments
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIndex: index("groups_name_idx").on(table.name),
}));

// Junction table for user-group membership
export const userGroups = pgTable("user_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint - user can only be in a group once
  userGroupUnique: uniqueIndex("user_groups_unique").on(table.userId, table.groupId),
  // Indexes for queries
  userIdIndex: index("user_groups_user_id_idx").on(table.userId),
  groupIdIndex: index("user_groups_group_id_idx").on(table.groupId),
}));

// Junction table for poll-group targeting
export const pollTargetGroups = pgTable("poll_target_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: 'cascade' }),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint - poll can only target a group once
  pollGroupUnique: uniqueIndex("poll_target_groups_unique").on(table.pollId, table.groupId),
  // Indexes for queries
  pollIdIndex: index("poll_target_groups_poll_id_idx").on(table.pollId),
  groupIdIndex: index("poll_target_groups_group_id_idx").on(table.groupId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  polls: many(polls),
  votes: many(votes),
  paymentTransactions: many(paymentTransactions),
  userGroups: many(userGroups),
  createdGroups: many(groups),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  creator: one(users, {
    fields: [polls.createdById],
    references: [users.id],
  }),
  options: many(pollOptions),
  votes: many(votes),
  targetGroups: many(pollTargetGroups),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.id],
  }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  poll: one(polls, {
    fields: [votes.pollId],
    references: [polls.id],
  }),
  option: one(pollOptions, {
    fields: [votes.optionId],
    references: [pollOptions.id],
  }),
  voter: one(users, {
    fields: [votes.voterId],
    references: [users.id],
  }),
}));

export const voteAttemptsRelations = relations(voteAttempts, ({ one }) => ({
  poll: one(polls, {
    fields: [voteAttempts.pollId],
    references: [polls.id],
  }),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  user: one(users, {
    fields: [paymentTransactions.userId],
    references: [users.id],
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdById],
    references: [users.id],
  }),
  userGroups: many(userGroups),
  pollTargetGroups: many(pollTargetGroups),
}));

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  user: one(users, {
    fields: [userGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [userGroups.groupId],
    references: [groups.id],
  }),
}));

export const pollTargetGroupsRelations = relations(pollTargetGroups, ({ one }) => ({
  poll: one(polls, {
    fields: [pollTargetGroups.pollId],
    references: [polls.id],
  }),
  group: one(groups, {
    fields: [pollTargetGroups.groupId],
    references: [groups.id],
  }),
}));

// Insert schemas
export const insertPollSchema = createInsertSchema(polls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPollOptionSchema = createInsertSchema(pollOptions).omit({
  id: true,
  createdAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserGroupSchema = createInsertSchema(userGroups).omit({
  id: true,
  createdAt: true,
});

export const insertPollTargetGroupSchema = createInsertSchema(pollTargetGroups).omit({
  id: true,
  createdAt: true,
});

export const insertVoteAttemptSchema = createInsertSchema(voteAttempts).omit({
  id: true,
  createdAt: true,
  lastAttemptAt: true,
});

export const insertUsedVoteTokenSchema = createInsertSchema(usedVoteTokens).omit({
  id: true,
  usedAt: true,
});

// Insert schemas for users
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const registerUserSchema = insertUserSchema.extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const loginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = Omit<typeof users.$inferSelect, 'password'>; // Exclude password from public user type
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type Poll = typeof polls.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type PollOption = typeof pollOptions.$inferSelect;
export type InsertPollOption = z.infer<typeof insertPollOptionSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type UserGroup = typeof userGroups.$inferSelect;
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type PollTargetGroup = typeof pollTargetGroups.$inferSelect;
export type InsertPollTargetGroup = z.infer<typeof insertPollTargetGroupSchema>;
export type VoteAttempt = typeof voteAttempts.$inferSelect;
export type InsertVoteAttempt = z.infer<typeof insertVoteAttemptSchema>;
export type UsedVoteToken = typeof usedVoteTokens.$inferSelect;
export type InsertUsedVoteToken = z.infer<typeof insertUsedVoteTokenSchema>;

// Extended types for queries
export type PollWithDetails = Poll & {
  creator: User;
  options: PollOption[];
  voteCount: number;
  hasVoted?: boolean;
  targetGroups?: Group[];
};

export type PollWithResults = PollWithDetails & {
  results: Array<{
    optionId: string;
    text: string;
    voteCount: number;
    percentage: number;
  }>;
};

export type GroupWithMembers = Group & {
  memberCount: number;
  members?: User[];
};
