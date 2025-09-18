import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPollSchema, insertVoteSchema } from "@shared/schema";
import { z } from "zod";

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
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
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
      console.log('User object:', req.user);
      console.log('Request body:', req.body);
      
      const validatedData = createPollWithOptionsSchema.parse(req.body);
      
      // Get user ID from authenticated user
      const userId = req.user?.claims?.sub || req.user?.sub || req.user?.id;
      
      if (!userId) {
        console.error('No user ID found in request:', req.user);
        return res.status(401).json({ message: "User authentication invalid" });
      }
      
      const { options, ...pollData } = validatedData;
      
      // Generate unique shareable slug if poll is public shareable
      const finalPollData = {
        ...pollData,
        createdById: userId,
        shareableSlug: pollData.isPublicShareable ? generateShareableSlug() : null
      };
      
      const poll = await storage.createPoll(
        finalPollData,
        options
      );
      
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
      const userId = req.user.claims.sub;
      const polls = await storage.getUserPolls(userId);
      res.json(polls);
    } catch (error) {
      console.error("Error fetching user polls:", error);
      res.status(500).json({ message: "Failed to fetch user polls" });
    }
  });

  app.delete('/api/polls/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const { optionId, optionIds } = req.body;
      
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

      // Robust user ID extraction (consistent with create poll route)
      const userId = req.isAuthenticated() ? (req.user?.claims?.sub || req.user?.sub || req.user?.id) : undefined;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // For non-anonymous polls, ensure we have a valid userId
      if (!poll.isAnonymous && !userId) {
        return res.status(401).json({ message: "Valid user authentication required for non-anonymous polls" });
      }

      // For non-anonymous polls, use userId only; for anonymous polls, use IP only
      const identifierUserId = poll.isAnonymous ? undefined : userId;
      const identifierIP = poll.isAnonymous ? ipAddress : undefined;

      // Check if user/IP already voted
      const hasVoted = await storage.hasUserVoted(pollId, identifierUserId, identifierIP);
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
            };
            const vote = await storage.submitVote(voteData);
            votes.push(vote);
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
          };
          
          const updatedVote = await storage.updateVote(pollId, updateVoteData, identifierUserId, identifierIP);
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
          };
          const vote = await storage.submitVote(voteData);
          votes.push(vote);
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
        };

        const vote = await storage.submitVote(voteData);
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
      const userId = req.isAuthenticated() ? req.user?.claims?.sub : undefined;
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      const hasVoted = await storage.hasUserVoted(pollId, userId, ipAddress);
      res.json({ hasVoted });
    } catch (error) {
      console.error("Error checking vote status:", error);
      res.status(500).json({ message: "Failed to check vote status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
