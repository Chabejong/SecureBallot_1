import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerUser } from "./localAuth";
import { insertPollSchema, insertVoteSchema, registerUserSchema, loginUserSchema, forgotPasswordSchema, resetPasswordSchema, users, paymentTransactions, insertPaymentTransactionSchema } from "@shared/schema";
import { z } from "zod";
import passport from "passport";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendPasswordResetEmail } from "./emailService";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { 
  hashFingerprint, 
  validateVoteToken, 
  deserializeVoteToken,
  checkRateLimit,
  validateBehavior,
  validateTiming,
  type VoteToken 
} from "./voteValidation";

const createPollWithOptionsSchema = insertPollSchema.extend({
  options: z.array(z.object({
    text: z.string().min(1, "Option text cannot be empty"),
    imageUrl: z.string().optional().or(z.literal("")).refine((val) => {
      if (!val) return true;
      return val.startsWith('data:') || /^https?:\/\/.+/.test(val);
    }, "Must be a valid URL or uploaded image"),
  })).min(2, "At least 2 options required"),
  endDate: z.string().transform((dateString) => new Date(dateString)),
}).omit({
  createdById: true, // We'll add this in the route
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Health check endpoint to handle repeated HEAD requests
  app.head('/api', (req, res) => {
    res.status(200).end();
  });

  app.get('/api', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
  });

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
      const user = await registerUser(validatedData);
      res.status(201).json({ message: "Registration successful", user });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      if (error.message === 'Email already registered') {
        return res.status(409).json({ message: "Email already registered" });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/login', (req, res, next) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);
      
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }
        
        req.logIn(user, (err) => {
          if (err) {
            console.error("Session error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          return res.json({ message: "Login successful", user });
        });
      })(req, res, next);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid login data", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      // Destroy the session to ensure complete logout
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: "Logout successful" });
      });
    });
  });


  // Password reset routes
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists or not
        return res.json({ 
          message: 'If an account with that email exists, we have sent a password reset link.' 
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

      // Store token in database
      await storage.setResetToken(user.id, resetToken, tokenExpiry);

      // Send reset email
      const emailSent = await sendPasswordResetEmail(email, resetToken, user.firstName || undefined);
      
      if (!emailSent) {
        console.error('Failed to send password reset email to:', email);
        return res.status(500).json({ 
          message: 'Failed to send reset email. Please try again.' 
        });
      }

      res.json({ 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Invalid email address', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.tokenExpiry || new Date() > user.tokenExpiry) {
        return res.status(400).json({ 
          message: 'Invalid or expired reset token' 
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update password and clear reset token
      await storage.resetPassword(user.id, hashedPassword);

      res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Invalid input data', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Poll routes
  app.get('/api/polls', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const polls = await storage.getPolls(limit);
      res.json(polls);
    } catch (error) {
      console.error("Error fetching polls:", error);
      res.status(500).json({ message: "Failed to fetch polls" });
    }
  });

  app.get('/api/polls/:id', async (req, res) => {
    try {
      const poll = await storage.getPoll(req.params.id);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      res.json(poll);
    } catch (error) {
      console.error("Error fetching poll:", error);
      res.status(500).json({ message: "Failed to fetch poll" });
    }
  });

  app.get('/api/polls/:id/results', async (req, res) => {
    try {
      const results = await storage.getPollResults(req.params.id);
      if (!results) {
        return res.status(404).json({ message: "Poll not found" });
      }
      res.json(results);
    } catch (error) {
      console.error("Error fetching poll results:", error);
      res.status(500).json({ message: "Failed to fetch poll results" });
    }
  });

  // Helper function to generate unique shareable slug with collision checking
  const generateUniqueShareableSlug = async (): Promise<string> => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      let slug = '';
      for (let i = 0; i < 8; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Check if slug already exists
      try {
        const existingPoll = await storage.getPollBySlug(slug);
        if (!existingPoll) {
          return slug;
        }
      } catch (error) {
        // If getPollBySlug doesn't exist or errors, slug is probably unique
        return slug;
      }
      
      attempts++;
    }
    
    // Fallback: generate a timestamp-based slug if all attempts fail
    return `poll_${Date.now().toString(36)}`;
  };

  app.post('/api/polls', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = createPollWithOptionsSchema.parse(req.body);
      
      // Get user ID from authenticated user
      const userId = req.user?.id;
      
      if (!userId) {
        console.error('No user ID found in request:', req.user);
        return res.status(401).json({ message: "User authentication invalid" });
      }
      
      // Check subscription limits
      const limitCheck = await storage.canCreatePoll(userId);
      if (!limitCheck.canCreate) {
        const upgradeMessage = limitCheck.currentTier === "free" 
          ? "You've reached your free tier limit of 1 poll per month. Upgrade to a premium plan for unlimited polls."
          : "You've reached your poll limit for this tier. Upgrade to create more polls.";
        
        return res.status(403).json({ 
          message: upgradeMessage,
          currentTier: limitCheck.currentTier,
          pollCount: limitCheck.pollCount,
          limit: limitCheck.limit,
          needsUpgrade: true
        });
      }
      
      const { options, ...pollData } = validatedData;
      
      // Generate unique shareable slug for all poll types
      const finalPollData = {
        ...pollData,
        createdById: userId,
        shareableSlug: await generateUniqueShareableSlug()
      };
      
      const poll = await storage.createPoll(
        finalPollData,
        options
      );
      
      // Increment user's monthly poll count for tracking
      // Note: The actual limit check uses real-time count from polls table
      await db.update(users)
        .set({ 
          pollsThisMonth: sql`${users.pollsThisMonth} + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      res.status(201).json(poll);
    } catch (error: any) {
      console.error("Error creating poll:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid poll data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create poll" });
    }
  });

  app.get('/api/user/polls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const polls = await storage.getUserPolls(userId);
      res.json(polls);
    } catch (error) {
      console.error("Error fetching user polls:", error);
      res.status(500).json({ message: "Failed to fetch user polls" });
    }
  });

  app.delete('/api/polls/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const poll = await storage.getPoll(req.params.id);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      if (poll.createdById !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this poll" });
      }
      
      const deleted = await storage.deletePoll(req.params.id);
      if (deleted) {
        res.json({ message: "Poll deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete poll" });
      }
    } catch (error) {
      console.error("Error deleting poll:", error);
      res.status(500).json({ message: "Failed to delete poll" });
    }
  });

  // Delete all polls endpoint (for testing purposes)
  app.delete('/api/polls', async (req, res) => {
    try {
      const deletedCount = await storage.deleteAllPolls();
      res.json({ 
        message: `Deleted ${deletedCount} poll(s) successfully`,
        deletedCount 
      });
    } catch (error) {
      console.error("Error deleting all polls:", error);
      res.status(500).json({ message: "Failed to delete all polls" });
    }
  });

  // Voting routes
  app.post('/api/polls/:id/vote', async (req: any, res) => {
    try {
      const pollId = req.params.id;
      const { optionId, optionIds, voteToken, timeOnPage } = req.body;
      
      const votingOptions = optionIds || [optionId];
      if (!votingOptions || votingOptions.length === 0) {
        return res.status(400).json({ message: "At least one option ID is required" });
      }

      // Check if poll exists and is active
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      if (!poll.isActive) {
        return res.status(400).json({ message: "Poll is not active" });
      }
      
      if (new Date() > poll.endDate) {
        return res.status(400).json({ message: "Poll has ended" });
      }

      // For non-anonymous polls, require authentication
      if (!poll.isAnonymous && !req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required for non-anonymous polls" });
      }

      // Validate multiple selections are only allowed for multiple choice polls
      if (votingOptions.length > 1 && !poll.isMultipleChoice) {
        return res.status(400).json({ message: "Multiple selections are not allowed for this poll" });
      }

      // Check if all options belong to this poll
      const pollOptions = await storage.getPollOptions(pollId);
      const validOptionIds = pollOptions.map(opt => opt.id);
      const invalidOptions = votingOptions.filter((id: string) => !validOptionIds.includes(id));
      if (invalidOptions.length > 0) {
        return res.status(400).json({ message: "Invalid option(s) selected" });
      }

      // Extract user identification information
      const userId = req.isAuthenticated() ? req.user?.id : undefined;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const browserFingerprint = req.headers['x-fingerprint'] || req.headers['user-agent'];
      const hashedFp = browserFingerprint ? hashFingerprint(browserFingerprint.toString()) : undefined;

      // For non-anonymous polls, ensure we have a valid userId
      if (!poll.isAnonymous && !userId) {
        return res.status(401).json({ message: "Valid user authentication required for non-anonymous polls" });
      }

      // Rate limiting check for anonymous polls
      if (poll.isAnonymous && ipAddress) {
        const attempt = await storage.getVoteAttempt(pollId, ipAddress.toString(), hashedFp);
        const rateLimitResult = checkRateLimit(attempt || null);
        
        if (!rateLimitResult.allowed) {
          return res.status(429).json({ 
            message: rateLimitResult.reason || "Too many voting attempts",
            resetAt: rateLimitResult.resetAt 
          });
        }

        await storage.incrementVoteAttempt(pollId, ipAddress.toString(), hashedFp);
      }

      // Validate vote token if provided
      if (voteToken) {
        const token = deserializeVoteToken(voteToken);
        if (!token) {
          return res.status(400).json({ message: "Invalid vote token format" });
        }

        const tokenValidation = validateVoteToken(token);
        if (!tokenValidation.valid) {
          return res.status(400).json({ message: tokenValidation.reason || "Invalid vote token" });
        }
      }

      // Behavioral validation
      const behaviorValidation = validateBehavior(timeOnPage);
      if (!behaviorValidation.valid) {
        return res.status(400).json({ message: behaviorValidation.reason || "Please review the poll before voting" });
      }

      // Timing validation
      const timingValidation = validateTiming(timeOnPage, null);
      if (!timingValidation.valid) {
        return res.status(400).json({ message: timingValidation.reason || "Please wait before voting" });
      }

      // For non-anonymous polls, use userId only; for anonymous polls, use IP + fingerprint
      const identifierUserId = poll.isAnonymous ? undefined : userId;
      const identifierIP = poll.isAnonymous ? ipAddress : undefined;
      const identifierFingerprint = poll.isAnonymous ? browserFingerprint : undefined;

      // Check if user/IP already voted
      const hasVoted = await storage.hasUserVoted(pollId, identifierUserId, identifierIP, identifierFingerprint);
      if (hasVoted) {
        // Check if poll allows vote changes
        if (!poll.allowVoteChanges) {
          return res.status(400).json({ message: "You have already voted in this poll" });
        }
        
        // For multiple choice, we need to handle multiple votes
        if (poll.isMultipleChoice) {
          // Remove all existing votes for this user/IP
          await storage.removeUserVotes(pollId, identifierUserId, identifierIP);
          
          // Create new votes for each selected option
          const votes = [];
          for (const optionId of votingOptions) {
            const voteData = {
              pollId,
              optionId,
              voterId: identifierUserId,
              ipAddress: identifierIP,
              browserFingerprint: identifierFingerprint?.substring(0, 255),
              hashedFingerprint: hashedFp || null,
              voteToken: voteToken || null,
              timeOnPage: timeOnPage || null,
            };
            const vote = await storage.submitVote(voteData);
            votes.push(vote);
          }
          
          // Reset rate limit attempt on successful vote
          if (poll.isAnonymous && ipAddress) {
            await storage.resetVoteAttempt(pollId, ipAddress.toString(), hashedFp);
          }
          
          return res.status(200).json({ 
            message: "Votes updated successfully", 
            voteIds: votes.map(v => v.id) 
          });
        } else {
          // Single choice - update existing vote
          const updateVoteData = {
            pollId,
            optionId: votingOptions[0],
            voterId: identifierUserId,
            ipAddress: identifierIP,
            browserFingerprint: identifierFingerprint?.substring(0, 255),
            hashedFingerprint: hashedFp || null,
            voteToken: voteToken || null,
            timeOnPage: timeOnPage || null,
          };
          
          const updatedVote = await storage.updateVote(pollId, updateVoteData, identifierUserId, identifierIP);
          
          // Reset rate limit attempt on successful vote
          if (poll.isAnonymous && ipAddress) {
            await storage.resetVoteAttempt(pollId, ipAddress.toString(), hashedFp);
          }
          
          return res.status(200).json({ message: "Vote updated successfully", voteId: updatedVote.id });
        }
      }

      // Create new votes
      if (poll.isMultipleChoice) {
        const votes = [];
        for (const optionId of votingOptions) {
          const voteData = {
            pollId,
            optionId,
            voterId: identifierUserId,
            ipAddress: identifierIP,
            browserFingerprint: identifierFingerprint?.substring(0, 255),
            hashedFingerprint: hashedFp || null,
            voteToken: voteToken || null,
            timeOnPage: timeOnPage || null,
          };
          const vote = await storage.submitVote(voteData);
          votes.push(vote);
        }
        
        // Reset rate limit attempt on successful vote
        if (poll.isAnonymous && ipAddress) {
          await storage.resetVoteAttempt(pollId, ipAddress.toString(), hashedFp);
        }
        
        res.status(201).json({ 
          message: "Votes submitted successfully", 
          voteIds: votes.map(v => v.id) 
        });
      } else {
        const voteData = {
          pollId,
          optionId: votingOptions[0],
          voterId: identifierUserId,
          ipAddress: identifierIP,
          browserFingerprint: identifierFingerprint?.substring(0, 255),
          hashedFingerprint: hashedFp || null,
          voteToken: voteToken || null,
          timeOnPage: timeOnPage || null,
        };

        const vote = await storage.submitVote(voteData);
        
        // Reset rate limit attempt on successful vote
        if (poll.isAnonymous && ipAddress) {
          await storage.resetVoteAttempt(pollId, ipAddress.toString(), hashedFp);
        }
        
        res.status(201).json({ message: "Vote submitted successfully", voteId: vote.id });
      }
    } catch (error: any) {
      console.error("Error submitting vote:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit vote" });
    }
  });

  app.get('/api/polls/:id/export', async (req: any, res) => {
    try {
      const pollId = req.params.id;
      const format = req.query.format as string;
      
      if (!format || !['csv', 'json'].includes(format)) {
        return res.status(400).json({ message: "Format must be 'csv' or 'json'" });
      }

      // Get poll results
      const pollResults = await storage.getPollResults(pollId);
      if (!pollResults) {
        return res.status(404).json({ message: "Poll not found" });
      }

      // Check if poll has ended
      const now = new Date();
      if (now < pollResults.endDate) {
        return res.status(403).json({ message: "Poll has not ended yet. Export is only available after the poll ends." });
      }

      if (format === 'csv') {
        // Generate CSV
        const csvLines = [
          'Option,Votes,Percentage',
          ...pollResults.results.map(result => 
            `"${result.text.replace(/"/g, '""')}",${result.voteCount},${result.percentage}%`
          )
        ];
        
        const csvContent = csvLines.join('\n');
        const filename = `${pollResults.title.replace(/[^a-zA-Z0-9]/g, '_')}_Results.csv`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
      } else {
        // Generate JSON
        const jsonData = {
          id: pollResults.id,
          title: pollResults.title,
          description: pollResults.description,
          endedAt: pollResults.endDate,
          totalVotes: pollResults.results.reduce((sum, result) => sum + result.voteCount, 0),
          options: pollResults.results.map(result => ({
            id: result.optionId,
            text: result.text,
            votes: result.voteCount,
            percentage: result.percentage
          }))
        };
        
        const filename = `${pollResults.title.replace(/[^a-zA-Z0-9]/g, '_')}_Results.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(jsonData);
      }
    } catch (error) {
      console.error("Error exporting poll results:", error);
      res.status(500).json({ message: "Failed to export poll results" });
    }
  });

  app.get('/api/polls/:id/has-voted', async (req: any, res) => {
    try {
      const pollId = req.params.id;
      const userId = req.isAuthenticated() ? req.user?.id : undefined;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const browserFingerprint = req.headers['x-fingerprint'] || req.headers['user-agent'];
      
      // Get poll to check if it's anonymous
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      // Use same logic as vote submission: for anonymous polls use IP + fingerprint, for non-anonymous use userId
      const identifierUserId = poll.isAnonymous ? undefined : userId;
      const identifierIP = poll.isAnonymous ? ipAddress : undefined;
      const identifierFingerprint = poll.isAnonymous ? browserFingerprint : undefined;
      
      const hasVoted = await storage.hasUserVoted(pollId, identifierUserId, identifierIP, identifierFingerprint);
      res.json({ hasVoted });
    } catch (error) {
      console.error("Error checking vote status:", error);
      res.status(500).json({ message: "Failed to check vote status" });
    }
  });

  // Public routes for shareable polls (no authentication required)
  
  // Get poll by shareable slug
  app.get('/api/public/polls/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const poll = await storage.getPollBySlug(slug);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      // Only allow access to public shareable polls
      if (!poll.isPublicShareable) {
        return res.status(403).json({ message: "Poll is not publicly accessible" });
      }
      
      res.json(poll);
    } catch (error) {
      console.error("Error fetching public poll:", error);
      res.status(500).json({ message: "Failed to fetch poll" });
    }
  });

  // Vote on poll by shareable slug (no authentication required)
  app.post('/api/public/polls/:slug/vote', async (req: any, res) => {
    try {
      const slug = req.params.slug;
      const { optionId, optionIds } = req.body;
      
      const votingOptions = optionIds || [optionId];
      if (!votingOptions || votingOptions.length === 0) {
        return res.status(400).json({ message: "At least one option ID is required" });
      }

      // Check if poll exists and is public shareable
      const poll = await storage.getPollBySlug(slug);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      if (!poll.isPublicShareable) {
        return res.status(403).json({ message: "Poll is not publicly accessible" });
      }
      
      if (!poll.isActive) {
        return res.status(400).json({ message: "Poll is not active" });
      }
      
      if (new Date() > poll.endDate) {
        return res.status(400).json({ message: "Poll has ended" });
      }

      // Public shareable polls should be anonymous by design
      if (!poll.isAnonymous) {
        return res.status(400).json({ message: "Public shareable polls must be anonymous" });
      }

      // Validate multiple selections are only allowed for multiple choice polls
      if (votingOptions.length > 1 && !poll.isMultipleChoice) {
        return res.status(400).json({ message: "Multiple selections are not allowed for this poll" });
      }

      // Check if all options belong to this poll
      const pollOptions = await storage.getPollOptions(poll.id);
      const validOptionIds = pollOptions.map(opt => opt.id);
      const invalidOptions = votingOptions.filter((id: string) => !validOptionIds.includes(id));
      if (invalidOptions.length > 0) {
        return res.status(400).json({ message: "Invalid option(s) selected" });
      }

      // For public polls, use IP address and browser fingerprint for identification
      const ipAddress = req.ip || req.connection.remoteAddress;
      const browserFingerprint = req.headers['x-fingerprint'] || req.headers['user-agent'];
      
      // Check if this device already voted (using IP + browser fingerprint)
      const hasVoted = await storage.hasUserVoted(poll.id, undefined, ipAddress, browserFingerprint);
      if (hasVoted) {
        if (poll.allowVoteChanges) {
          // Update existing vote
          for (const optionId of votingOptions) {
            const vote = {
              pollId: poll.id,
              optionId,
              voterId: undefined, // Anonymous
              ipAddress,
              browserFingerprint: browserFingerprint?.substring(0, 255), // Truncate if too long
            };
            await storage.updateVote(poll.id, vote, undefined, ipAddress);
          }
          return res.json({ message: "Vote updated successfully" });
        } else {
          return res.status(400).json({ message: "You have already voted on this poll" });
        }
      }

      // Submit new votes
      for (const optionId of votingOptions) {
        const vote = {
          pollId: poll.id,
          optionId,
          voterId: undefined, // Anonymous
          ipAddress,
          browserFingerprint: browserFingerprint?.substring(0, 255), // Truncate if too long
        };
        await storage.submitVote(vote);
      }

      res.status(201).json({ message: "Vote submitted successfully" });
    } catch (error: any) {
      console.error("Error submitting vote:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit vote" });
    }
  });

  // Get poll results by shareable slug
  app.get('/api/public/polls/:slug/results', async (req, res) => {
    try {
      const slug = req.params.slug;
      const poll = await storage.getPollBySlug(slug);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      if (!poll.isPublicShareable) {
        return res.status(403).json({ message: "Poll is not publicly accessible" });
      }
      
      const results = await storage.getPollResults(poll.id);
      if (!results) {
        return res.status(404).json({ message: "Poll results not found" });
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching public poll results:", error);
      res.status(500).json({ message: "Failed to fetch poll results" });
    }
  });

  // Check if user has voted on a public poll
  app.get('/api/public/polls/:slug/has-voted', async (req: any, res) => {
    try {
      const slug = req.params.slug;
      const poll = await storage.getPollBySlug(slug);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      
      if (!poll.isPublicShareable) {
        return res.status(403).json({ message: "Poll is not publicly accessible" });
      }
      
      const ipAddress = req.ip || req.connection.remoteAddress;
      const browserFingerprint = req.headers['x-fingerprint'] || req.headers['user-agent'];
      const hasVoted = await storage.hasUserVoted(poll.id, undefined, ipAddress, browserFingerprint);
      
      res.json({ hasVoted });
    } catch (error) {
      console.error("Error checking vote status:", error);
      res.status(500).json({ message: "Failed to check vote status" });
    }
  });

  // Authenticated poll access endpoints using shareable slugs
  // Get poll data by slug for authenticated users (members, invited polls)
  app.get('/api/auth/polls/:slug', isAuthenticated, async (req: any, res) => {
    try {
      const slug = req.params.slug;
      const userId = req.user?.id;
      
      const poll = await storage.getPollBySlug(slug);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      // Check if user has access based on poll type
      if (poll.pollType === 'invited') {
        // For invited polls, check if user is explicitly invited (implement invitation logic later)
        // For now, allow access to all authenticated users
      }
      
      res.json(poll);
    } catch (error) {
      console.error("Error fetching poll by slug:", error);
      res.status(500).json({ message: "Failed to fetch poll" });
    }
  });

  // Vote on poll by slug for authenticated users
  app.post('/api/auth/polls/:slug/vote', isAuthenticated, async (req: any, res) => {
    try {
      const slug = req.params.slug;
      const userId = req.user?.id;
      const { optionId } = req.body;
      
      const poll = await storage.getPollBySlug(slug);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      // Check if poll is active and not expired
      if (!poll.isActive || new Date() > new Date(poll.endDate)) {
        return res.status(400).json({ message: "Poll is closed or expired" });
      }

      // Check if user has access based on poll type
      if (poll.pollType === 'invited') {
        // For invited polls, check if user is explicitly invited (implement invitation logic later)
        // For now, allow access to all authenticated users
      }

      // Check if user already voted
      const hasVoted = await storage.hasUserVoted(poll.id, userId);
      if (hasVoted && !poll.allowVoteChanges) {
        return res.status(400).json({ message: "You have already voted on this poll" });
      }

      await storage.submitVote({ pollId: poll.id, optionId, voterId: userId });
      
      res.json({ message: "Vote submitted successfully" });
    } catch (error) {
      console.error("Error submitting vote by slug:", error);
      res.status(500).json({ message: "Failed to submit vote" });
    }
  });

  // PayPal routes
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Subscription limit check endpoint
  app.get('/api/user/poll-limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limitCheck = await storage.canCreatePoll(userId);
      res.json(limitCheck);
    } catch (error) {
      console.error("Error checking poll limits:", error);
      res.status(500).json({ message: "Failed to check poll limits" });
    }
  });

  // Secure subscription update after PayPal payment verification
  app.post('/api/subscription/verify-and-upgrade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { paypalOrderId, amount, tier: requestedTier } = req.body;
      
      if (!paypalOrderId) {
        return res.status(400).json({ message: "PayPal order ID is required" });
      }

      // SECURITY: Check if this PayPal order has already been used (prevent replay attacks)
      const existingTransaction = await db.select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.paypalOrderId, paypalOrderId))
        .limit(1);

      if (existingTransaction.length > 0) {
        return res.status(400).json({ 
          message: "This payment has already been processed." 
        });
      }

      // Map amounts to tiers (these should match the pricing page exactly)
      const amountToTier: Record<string, string> = {
        "5.00": "basic",
        "10.00": "standard", 
        "25.00": "premium",
        "50.00": "professional",
        "75.00": "enterprise",
        "100.00": "ultimate"
      };

      // SECURITY: Validate the amount/tier combination matches our pricing
      // Even though we trust PayPal captured the payment, validate the mapping
      if (!amount || !amountToTier[amount]) {
        return res.status(400).json({ 
          message: "Invalid payment amount" 
        });
      }

      const validatedTier = amountToTier[amount];
      
      // Additional security: ensure requested tier matches the payment amount
      if (requestedTier && requestedTier !== validatedTier) {
        console.warn(`Tier mismatch: amount ${amount} maps to ${validatedTier}, but ${requestedTier} was requested`);
      }

      // Start database transaction for atomic payment processing
      try {
        // Create payment transaction record first (this provides idempotency)
        const [paymentTransaction] = await db.insert(paymentTransactions)
          .values({
            userId,
            paypalOrderId,
            amount,
            currency: "EUR",
            tier: validatedTier,
            status: "completed",
            completedAt: new Date()
          })
          .returning();

        // Calculate subscription dates (1 month from now)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        // Update user subscription
        await storage.updateUserSubscription(userId, validatedTier, startDate, endDate);
        
        console.log(`Successfully processed subscription upgrade for user ${userId}:`, {
          paypalOrderId,
          amount,
          tier: validatedTier,
          transactionId: paymentTransaction.id
        });

        // Return updated user info
        const updatedUser = await storage.getUser(userId);
        
        res.json({ 
          message: "Subscription updated successfully",
          user: updatedUser,
          tier: validatedTier,
          amount,
          startDate,
          endDate,
          transactionId: paymentTransaction.id
        });

      } catch (dbError: any) {
        // Handle unique constraint violation (race condition protection)
        if (dbError.code === '23505' && dbError.constraint === 'payment_transactions_paypal_order_id_unique') {
          return res.status(400).json({ 
            message: "This payment has already been processed." 
          });
        }
        throw dbError; // Re-throw other database errors
      }

    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Get poll results by slug for authenticated users
  app.get('/api/auth/polls/:slug/results', isAuthenticated, async (req: any, res) => {
    try {
      const slug = req.params.slug;
      const userId = req.user?.id;
      
      const poll = await storage.getPollBySlug(slug);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      // Check if user has access based on poll type
      if (poll.pollType === 'invited') {
        // For invited polls, check if user is explicitly invited (implement invitation logic later)
        // For now, allow access to all authenticated users
      }

      const results = await storage.getPollResults(poll.id);
      res.json(results);
    } catch (error) {
      console.error("Error fetching poll results by slug:", error);
      res.status(500).json({ message: "Failed to fetch poll results" });
    }
  });

  // Check if authenticated user has voted on poll by slug
  app.get('/api/auth/polls/:slug/has-voted', isAuthenticated, async (req: any, res) => {
    try {
      const slug = req.params.slug;
      const userId = req.user?.id;
      
      const poll = await storage.getPollBySlug(slug);
      
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      // Check if user has access based on poll type
      if (poll.pollType === 'invited') {
        // For invited polls, check if user is explicitly invited (implement invitation logic later)
        // For now, allow access to all authenticated users
      }

      const hasVoted = await storage.hasUserVoted(poll.id, userId);
      res.json({ hasVoted });
    } catch (error) {
      console.error("Error checking vote status by slug:", error);
      res.status(500).json({ message: "Failed to check vote status" });
    }
  });

  // Admin endpoint - development only
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/admin/set-admin', async (req, res) => {
      try {
        const { email, isAdmin } = req.body;
        
        if (!email || typeof isAdmin !== 'boolean') {
          return res.status(400).json({ message: "Email and isAdmin (boolean) are required" });
        }
        
        await storage.setAdminStatus(email, isAdmin);
        res.json({ message: `Admin status for ${email} set to ${isAdmin}` });
      } catch (error) {
        console.error("Error setting admin status:", error);
        res.status(500).json({ message: "Failed to set admin status" });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
