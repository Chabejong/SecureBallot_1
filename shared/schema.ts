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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
});

export const pollOptions = pgTable("poll_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: 'cascade' }),
  text: varchar("text", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: 'cascade' }),
  optionId: varchar("option_id").notNull().references(() => pollOptions.id, { onDelete: 'cascade' }),
  voterId: varchar("voter_id").references(() => users.id), // null for anonymous votes
  ipAddress: varchar("ip_address", { length: 45 }), // for tracking without user ID
  browserFingerprint: varchar("browser_fingerprint"), // for duplicate prevention in anonymous voting
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint for authenticated users - one vote per user per poll
  userPollUnique: uniqueIndex("votes_user_poll_unique").on(table.pollId, table.voterId).where(sql`voter_id IS NOT NULL`),
  // Unique constraint for anonymous users - one vote per device per poll  
  anonymousDeviceUnique: uniqueIndex("votes_anonymous_device_unique").on(table.pollId, table.ipAddress, table.browserFingerprint).where(sql`voter_id IS NULL`),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  polls: many(polls),
  votes: many(votes),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  creator: one(users, {
    fields: [polls.createdById],
    references: [users.id],
  }),
  options: many(pollOptions),
  votes: many(votes),
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

// Extended types for queries
export type PollWithDetails = Poll & {
  creator: User;
  options: PollOption[];
  voteCount: number;
  hasVoted?: boolean;
};

export type PollWithResults = PollWithDetails & {
  results: Array<{
    optionId: string;
    text: string;
    voteCount: number;
    percentage: number;
  }>;
};
