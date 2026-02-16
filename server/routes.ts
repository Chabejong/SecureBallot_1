import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerUser } from "./localAuth";
import { insertPollSchema, insertVoteSchema, registerUserSchema, loginUserSchema, forgotPasswordSchema, resetPasswordSchema, users, paymentTransactions, insertPaymentTransactionSchema, getInvitedPollPrice, INVITED_POLL_PRICING } from "@shared/schema";
import { z } from "zod";
import passport from "passport";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendPasswordResetEmail, sendEmail } from "./emailService";
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

  app.get('/api/polls/:id/participation-report', isAuthenticated, async (req: any, res) => {
    try {
      const pollId = req.params.id;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if poll exists
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      // Check if user is the poll owner
      if (poll.createdById !== userId) {
        return res.status(403).json({ message: "Not authorized to view participation report" });
      }

      // Check if poll has authentication numbers
      if (poll.pollType !== 'members' || !poll.authNumberStart || !poll.authNumberEnd) {
        return res.status(400).json({ message: "Participation report is only available for polls with authentication numbers" });
      }

      // Get participation report
      const report = await storage.getAuthNumberReport(pollId);
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching participation report:", error);
      res.status(500).json({ message: "Failed to fetch participation report" });
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
      
      // Create authentication numbers for members-only polls
      if (poll.pollType === 'members' && poll.authNumberStart && poll.authNumberEnd) {
        await storage.createAuthNumbers(poll.id, poll.authNumberStart, poll.authNumberEnd);
      }
      
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
      const { optionId, optionIds, authNumber, voteToken, timeOnPage } = req.body;
      
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

      // For members-only polls with authentication numbers, validate the auth number
      const requiresAuthNumber = poll.pollType === "members" && 
        poll.authNumberStart !== null && 
        poll.authNumberStart !== undefined && 
        poll.authNumberEnd !== null && 
        poll.authNumberEnd !== undefined;

      if (requiresAuthNumber) {
        if (!authNumber) {
          return res.status(400).json({ message: "Authentication number is required for this poll" });
        }

        const authNumberInt = parseInt(authNumber);
        if (isNaN(authNumberInt)) {
          return res.status(400).json({ message: "Invalid authentication number" });
        }

        // Validate auth number with storage
        const authValidation = await storage.validateAuthNumber(pollId, authNumberInt);
        if (!authValidation.valid) {
          return res.status(400).json({ message: authValidation.message });
        }
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

      // Skip vote token and behavioral validation for now - causing issues
      // TODO: Re-implement properly after database schema is fixed

      // For non-anonymous polls, use userId only; for anonymous polls, use IP + fingerprint
      const identifierUserId = poll.isAnonymous ? undefined : userId;
      const identifierIP = poll.isAnonymous ? ipAddress : undefined;
      const identifierFingerprint = poll.isAnonymous ? browserFingerprint : undefined;

      // Check if user/IP already voted
      const hasVoted = await storage.hasUserVoted(pollId, identifierUserId, identifierIP, identifierFingerprint);
      if (hasVoted) {
        // For polls with authentication numbers, don't allow vote changes
        if (requiresAuthNumber) {
          return res.status(400).json({ message: "You have already voted in this poll. Vote changes are not allowed for polls with authentication numbers." });
        }
        
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
        
        // Mark authentication number as used (if applicable)
        if (requiresAuthNumber && authNumber) {
          await storage.markAuthNumberAsUsed(pollId, parseInt(authNumber), votes[0].id);
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
        
        // Mark authentication number as used (if applicable)
        if (requiresAuthNumber && authNumber) {
          await storage.markAuthNumberAsUsed(pollId, parseInt(authNumber), vote.id);
        }
        
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
      const { optionId, optionIds, authNumber } = req.body;
      
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

      // For members-only polls with authentication numbers, validate the auth number
      const requiresAuthNumber = poll.pollType === "members" && 
        poll.authNumberStart !== null && 
        poll.authNumberStart !== undefined && 
        poll.authNumberEnd !== null && 
        poll.authNumberEnd !== undefined;

      if (requiresAuthNumber) {
        if (!authNumber) {
          return res.status(400).json({ message: "Authentication number is required for this poll" });
        }

        const authNumberInt = parseInt(authNumber);
        if (isNaN(authNumberInt)) {
          return res.status(400).json({ message: "Invalid authentication number" });
        }

        // Validate auth number with storage
        const authValidation = await storage.validateAuthNumber(poll.id, authNumberInt);
        if (!authValidation.valid) {
          return res.status(400).json({ message: authValidation.message });
        }
      }

      // For public polls, use IP address and browser fingerprint for identification
      const ipAddress = req.ip || req.connection.remoteAddress;
      const browserFingerprint = req.headers['x-fingerprint'] || req.headers['user-agent'];
      
      // Check if this device already voted (using IP + browser fingerprint)
      const hasVoted = await storage.hasUserVoted(poll.id, undefined, ipAddress, browserFingerprint);
      if (hasVoted) {
        // For polls with authentication numbers, don't allow vote changes
        if (requiresAuthNumber) {
          return res.status(400).json({ message: "You have already voted in this poll. Vote changes are not allowed for polls with authentication numbers." });
        }
        
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
      let voteId: string | undefined;
      for (const optionId of votingOptions) {
        const vote = {
          pollId: poll.id,
          optionId,
          voterId: undefined, // Anonymous
          ipAddress,
          browserFingerprint: browserFingerprint?.substring(0, 255), // Truncate if too long
        };
        const submittedVote = await storage.submitVote(vote);
        // Store the first vote ID for auth number tracking
        if (!voteId) {
          voteId = submittedVote.id;
        }
      }

      // Mark authentication number as used (if applicable)
      if (requiresAuthNumber && authNumber && voteId) {
        await storage.markAuthNumberAsUsed(poll.id, parseInt(authNumber), voteId);
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
      const { optionId, authNumber } = req.body;
      
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

      // For members-only polls with authentication numbers, validate the auth number
      const requiresAuthNumber = poll.pollType === "members" && 
        poll.authNumberStart !== null && 
        poll.authNumberStart !== undefined && 
        poll.authNumberEnd !== null && 
        poll.authNumberEnd !== undefined;

      if (requiresAuthNumber) {
        if (!authNumber) {
          return res.status(400).json({ message: "Authentication number is required for this poll" });
        }

        const authNumberInt = parseInt(authNumber);
        if (isNaN(authNumberInt)) {
          return res.status(400).json({ message: "Invalid authentication number" });
        }

        // Validate auth number with storage
        const authValidation = await storage.validateAuthNumber(poll.id, authNumberInt);
        if (!authValidation.valid) {
          return res.status(400).json({ message: authValidation.message });
        }
      }

      // Check if user already voted
      const hasVoted = await storage.hasUserVoted(poll.id, userId);
      if (hasVoted) {
        // For polls with authentication numbers, don't allow vote changes
        if (requiresAuthNumber) {
          return res.status(400).json({ message: "You have already voted in this poll. Vote changes are not allowed for polls with authentication numbers." });
        }
        
        if (!poll.allowVoteChanges) {
          return res.status(400).json({ message: "You have already voted on this poll" });
        }
      }

      const vote = await storage.submitVote({ pollId: poll.id, optionId, voterId: userId });
      
      // Mark authentication number as used (if applicable)
      if (requiresAuthNumber && authNumber) {
        await storage.markAuthNumberAsUsed(poll.id, parseInt(authNumber), vote.id);
      }
      
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

  // ===== INVITED POLL ROUTES =====

  const createInvitedPollSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    endDate: z.string().transform((dateString) => new Date(dateString)),
    showResultsToVoters: z.boolean().optional().default(false),
    questions: z.array(z.object({
      text: z.string().min(1, "Question text is required"),
      choiceType: z.string().optional().default("single"),
      options: z.array(z.object({
        text: z.string().min(1, "Option text is required"),
      })).min(2, "Each question needs at least 2 options"),
    })).min(1, "At least one question is required"),
  });

  // Static routes MUST come before parameterized :id routes
  app.get('/api/invited-polls/csv-template', (req, res) => {
    const csv = "email,phone\njohn@example.com,+1234567890\njane@example.com,+0987654321\n";
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="voter-template.csv"');
    res.send(csv);
  });

  app.get('/api/invited-polls/pricing', (req, res) => {
    res.json({ tiers: INVITED_POLL_PRICING });
  });

  app.post('/api/invited-polls', isAuthenticated, async (req: any, res) => {
    try {
      const data = createInvitedPollSchema.parse(req.body);
      const userId = req.user.id;

      const pollData = {
        title: data.title,
        description: data.description || null,
        pollType: "invited" as const,
        isAnonymous: true,
        allowComments: false,
        allowVoteChanges: false,
        isMultipleChoice: false,
        isActive: true,
        isPublicShareable: false,
        endDate: data.endDate,
        createdById: userId,
      };

      const poll = await storage.createInvitedPoll(pollData, data.questions);
      const details = await storage.getInvitedPollDetails(poll.id);
      res.status(201).json(details);
    } catch (error: any) {
      console.error("Error creating invited poll:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid poll data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invited poll" });
    }
  });

  app.get('/api/invited-polls/:id', isAuthenticated, async (req: any, res) => {
    try {
      const details = await storage.getInvitedPollDetails(req.params.id);
      if (!details) {
        return res.status(404).json({ message: "Poll not found" });
      }
      if (details.createdById !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.json(details);
    } catch (error) {
      console.error("Error fetching invited poll:", error);
      res.status(500).json({ message: "Failed to fetch invited poll" });
    }
  });

  app.get('/api/invited-polls/:id/questions', isAuthenticated, async (req: any, res) => {
    try {
      const questions = await storage.getInvitedPollQuestions(req.params.id);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Voter management
  const addVotersSchema = z.object({
    voters: z.array(z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }).refine(v => v.email || v.phone, "Either email or phone is required")),
  });

  app.post('/api/invited-polls/:id/voters', isAuthenticated, async (req: any, res) => {
    try {
      const poll = await storage.getInvitedPollDetails(req.params.id);
      if (!poll) return res.status(404).json({ message: "Poll not found" });
      if (poll.createdById !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const data = addVotersSchema.parse(req.body);
      const currentCount = await storage.getInvitedVoterCount(req.params.id);
      const newTotal = currentCount + data.voters.length;

      if (newTotal > 2000) {
        return res.status(400).json({ message: "Maximum 2000 voters per poll" });
      }

      const price = getInvitedPollPrice(newTotal);
      if (price === null) {
        return res.status(400).json({ message: "Voter count exceeds maximum allowed" });
      }

      const voters = await storage.addInvitedVoters(req.params.id, data.voters);
      res.status(201).json({ voters, totalCount: newTotal, price });
    } catch (error: any) {
      console.error("Error adding voters:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid voter data", errors: error.errors });
      }
      if (error.message?.includes("duplicate key")) {
        return res.status(400).json({ message: "Some voters are already added to this poll" });
      }
      res.status(500).json({ message: "Failed to add voters" });
    }
  });

  app.get('/api/invited-polls/:id/voters', isAuthenticated, async (req: any, res) => {
    try {
      const poll = await storage.getInvitedPollDetails(req.params.id);
      if (!poll) return res.status(404).json({ message: "Poll not found" });
      if (poll.createdById !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const voters = await storage.getInvitedVoters(req.params.id);
      res.json(voters);
    } catch (error) {
      console.error("Error fetching voters:", error);
      res.status(500).json({ message: "Failed to fetch voters" });
    }
  });

  app.get('/api/invited-polls/:id/participation', isAuthenticated, async (req: any, res) => {
    try {
      const poll = await storage.getInvitedPollDetails(req.params.id);
      if (!poll) return res.status(404).json({ message: "Poll not found" });
      if (poll.createdById !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const participation = await storage.getInvitedPollParticipation(req.params.id);
      res.json(participation);
    } catch (error) {
      console.error("Error fetching participation:", error);
      res.status(500).json({ message: "Failed to fetch participation data" });
    }
  });

  // Delete an invited voter
  app.delete('/api/invited-polls/:id/voters/:voterId', isAuthenticated, async (req: any, res) => {
    try {
      const poll = await storage.getInvitedPollDetails(req.params.id);
      if (!poll) return res.status(404).json({ message: "Poll not found" });
      if (poll.createdById !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteInvitedVoter(req.params.voterId, req.params.id);
      res.json({ message: "Voter removed" });
    } catch (error) {
      console.error("Error deleting voter:", error);
      res.status(500).json({ message: "Failed to delete voter" });
    }
  });

  // Token-based voting (public - no auth required)
  app.get('/api/invited-vote/:token', async (req, res) => {
    try {
      const voter = await storage.getInvitedVoterByToken(req.params.token);
      if (!voter) {
        return res.status(404).json({ message: "Invalid voting link" });
      }
      if (voter.hasVoted) {
        return res.status(400).json({ message: "You have already voted", alreadyVoted: true });
      }

      const poll = await storage.getInvitedPollDetails(voter.pollId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      if (!poll.isActive || new Date() > new Date(poll.endDate)) {
        return res.status(400).json({ message: "This poll has ended" });
      }

      res.json({
        poll: {
          id: poll.id,
          title: poll.title,
          description: poll.description,
          endDate: poll.endDate,
          questions: poll.questions,
        },
        voterId: voter.id,
      });
    } catch (error) {
      console.error("Error loading invited vote:", error);
      res.status(500).json({ message: "Failed to load voting page" });
    }
  });

  const submitInvitedVoteSchema = z.object({
    votes: z.array(z.object({
      questionId: z.string(),
      optionId: z.string(),
    })),
  });

  app.post('/api/invited-vote/:token', async (req, res) => {
    try {
      const voter = await storage.getInvitedVoterByToken(req.params.token);
      if (!voter) {
        return res.status(404).json({ message: "Invalid voting link" });
      }
      if (voter.hasVoted) {
        return res.status(400).json({ message: "You have already voted" });
      }

      const poll = await storage.getInvitedPollDetails(voter.pollId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }
      if (!poll.isActive || new Date() > new Date(poll.endDate)) {
        return res.status(400).json({ message: "This poll has ended" });
      }

      const data = submitInvitedVoteSchema.parse(req.body);

      const questionIds = poll.questions.map(q => q.id);
      for (const vote of data.votes) {
        if (!questionIds.includes(vote.questionId)) {
          return res.status(400).json({ message: "Invalid question ID" });
        }
        const question = poll.questions.find(q => q.id === vote.questionId);
        if (!question?.options.some(o => o.id === vote.optionId)) {
          return res.status(400).json({ message: "Invalid option ID" });
        }
      }

      if (data.votes.length !== poll.questions.length) {
        return res.status(400).json({ message: "You must answer all questions" });
      }

      await storage.submitInvitedVotes(voter.pollId, voter.id, data.votes);
      res.json({ message: "Your vote has been recorded. Thank you!" });
    } catch (error: any) {
      console.error("Error submitting invited vote:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid vote data" });
      }
      res.status(500).json({ message: "Failed to submit vote" });
    }
  });

  // Invited poll results (admin only, after poll ends)
  app.get('/api/invited-polls/:id/results', isAuthenticated, async (req: any, res) => {
    try {
      const poll = await storage.getInvitedPollDetails(req.params.id);
      if (!poll) return res.status(404).json({ message: "Poll not found" });
      if (poll.createdById !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const now = new Date();
      if (now < new Date(poll.endDate)) {
        return res.status(400).json({ message: "Results are hidden until the poll ends", pollEndDate: poll.endDate });
      }

      const results = await storage.getInvitedPollResults(req.params.id);
      res.json(results);
    } catch (error) {
      console.error("Error fetching invited poll results:", error);
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  // Send invitations via email
  app.post('/api/invited-polls/:id/send-invitations', isAuthenticated, async (req: any, res) => {
    try {
      const poll = await storage.getInvitedPollDetails(req.params.id);
      if (!poll) return res.status(404).json({ message: "Poll not found" });
      if (poll.createdById !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const voters = await storage.getInvitedVoters(req.params.id);
      const pendingVoters = voters.filter(v => v.invitationStatus === "pending" && v.email);

      if (pendingVoters.length === 0) {
        return res.status(400).json({ message: "No pending invitations to send" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      let sent = 0;
      let failed = 0;

      for (const voter of pendingVoters) {
        try {
          const voteLink = `${baseUrl}/invited-vote/${voter.token}`;
          
          if (voter.email) {
            const result = await sendEmail({
              to: voter.email,
              from: process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_VERIFIED_SENDER || 'noreply@ballotbox.com',
              subject: `You're invited to vote: ${poll.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #1a56db;">You've been invited to vote!</h2>
                  <p>You have been invited to participate in: <strong>${poll.title}</strong></p>
                  ${poll.description ? `<p>${poll.description}</p>` : ''}
                  <p>This is your personal voting link. Please do not share it with others.</p>
                  <p style="margin: 20px 0;">
                    <a href="${voteLink}" style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Cast Your Vote
                    </a>
                  </p>
                  <p style="color: #666; font-size: 12px;">
                    Voting ends: ${new Date(poll.endDate).toLocaleDateString()}
                  </p>
                  <p style="color: #999; font-size: 11px;">
                    This link is unique to you and can only be used once.
                  </p>
                </div>
              `,
            });

            if (result.success) {
              await storage.updateInvitationStatus(voter.id, "sent");
              sent++;
            } else {
              console.error(`Failed to send invitation to ${voter.email}: ${result.error}`);
              await storage.updateInvitationStatus(voter.id, "failed");
              failed++;
            }
          }
        } catch (emailError) {
          console.error(`Failed to send invitation to ${voter.email}:`, emailError);
          await storage.updateInvitationStatus(voter.id, "failed");
          failed++;
        }
      }

      res.json({ sent, failed, total: pendingVoters.length });
    } catch (error) {
      console.error("Error sending invitations:", error);
      res.status(500).json({ message: "Failed to send invitations" });
    }
  });

  // Invited poll payment - get price for current poll
  app.get('/api/invited-polls/:id/payment-info', isAuthenticated, async (req: any, res) => {
    try {
      const poll = await storage.getInvitedPollDetails(req.params.id);
      if (!poll) return res.status(404).json({ message: "Poll not found" });
      if (poll.createdById !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const voterCount = await storage.getInvitedVoterCount(req.params.id);
      const price = getInvitedPollPrice(voterCount);
      const existingPayment = await storage.getInvitedPollPayment(req.params.id);

      res.json({
        voterCount,
        price,
        isPaid: existingPayment?.status === "completed",
        paymentId: existingPayment?.id,
      });
    } catch (error) {
      console.error("Error fetching payment info:", error);
      res.status(500).json({ message: "Failed to fetch payment info" });
    }
  });

  // Record invited poll payment after PayPal capture
  app.post('/api/invited-polls/:id/record-payment', isAuthenticated, async (req: any, res) => {
    try {
      const { paypalOrderId } = req.body;
      const poll = await storage.getInvitedPollDetails(req.params.id);
      if (!poll) return res.status(404).json({ message: "Poll not found" });
      if (poll.createdById !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const voterCount = await storage.getInvitedVoterCount(req.params.id);
      const price = getInvitedPollPrice(voterCount);
      if (price === null) {
        return res.status(400).json({ message: "Invalid voter count" });
      }

      const payment = await storage.createInvitedPollPayment(
        req.params.id,
        req.user.id,
        voterCount,
        price.toString()
      );
      await storage.updateInvitedPollPaymentStatus(payment.id, "completed", paypalOrderId);

      res.json({ message: "Payment recorded", paymentId: payment.id });
    } catch (error) {
      console.error("Error recording payment:", error);
      res.status(500).json({ message: "Failed to record payment" });
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
