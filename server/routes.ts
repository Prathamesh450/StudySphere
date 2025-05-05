import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertPaperSchema, insertDiscussionPostSchema, insertDiscussionReplySchema, insertResourceSchema, insertStudyGroupSchema, insertStudyGroupMemberSchema, insertStudySessionSchema, insertActivitySchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import passport from "passport";
import { hashPassword } from "./utils";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only certain file types
    const allowedTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.jpg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, and PNG files are allowed.'));
    }
  }
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  console.log("Authentication check:", 
    req.isAuthenticated(), 
    "Session ID:", req.sessionID,
    "User:", req.user ? `ID: ${req.user.id}, Username: ${req.user.username}` : "No user"
  );
  
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send('You must be logged in to access this resource');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes and middleware
  setupAuth(app);

  // Serve uploaded files and theme.json
  app.use('/uploads', express.static(uploadsDir));
  app.get('/theme.json', (req, res) => {
    try {
      const themePath = path.join(process.cwd(), 'theme.json');
      if (fs.existsSync(themePath)) {
        res.sendFile(themePath);
      } else {
        // Default theme if file doesn't exist
        res.json({
          variant: 'professional',
          primary: 'hsl(222.2 47.4% 11.2%)',
          appearance: 'light',
          radius: 0.5
        });
      }
    } catch (error) {
      console.error('Error serving theme.json:', error);
      res.status(500).send('Error loading theme');
    }
  });

  // Past Papers API
  app.post('/api/papers', isAuthenticated, upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).send('No file uploaded');
      }

      // Parse and validate the paper data
      const paperData = insertPaperSchema.parse({
        ...req.body,
        fileUrl: `/uploads/${req.file.filename}`,
        uploaderId: req.user.id
      });

      const newPaper = await storage.createPaper(paperData);

      // Create an activity entry for this upload
      await storage.createActivity({
        userId: req.user.id,
        type: 'paper_upload',
        targetId: newPaper.id,
        targetType: 'paper',
        metadata: { title: newPaper.title }
      });

      res.status(201).json(newPaper);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/papers', async (req, res, next) => {
    try {
      const { course, year, institution } = req.query;
      const filters: any = {};
      
      if (course) filters.course = course;
      if (year) filters.year = year;
      if (institution) filters.institution = institution;
      
      const papers = await storage.getPapers(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(papers);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/papers/:id', async (req, res, next) => {
    try {
      const paperId = parseInt(req.params.id);
      const paper = await storage.getPaper(paperId);
      
      if (!paper) {
        return res.status(404).send('Paper not found');
      }
      
      res.json(paper);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/papers/:id/download', async (req, res, next) => {
    try {
      const paperId = parseInt(req.params.id);
      const paper = await storage.incrementPaperDownloads(paperId);
      
      if (!paper) {
        return res.status(404).send('Paper not found');
      }
      
      res.json(paper);
    } catch (error) {
      next(error);
    }
  });

  // Discussion Forum API
  app.post('/api/discussions', isAuthenticated, async (req, res, next) => {
    try {
      const postData = insertDiscussionPostSchema.parse({
        ...req.body,
        authorId: req.user.id
      });

      const newPost = await storage.createDiscussionPost(postData);

      // Create an activity entry for this post
      await storage.createActivity({
        userId: req.user.id,
        type: 'post_created',
        targetId: newPost.id,
        targetType: 'discussion_post',
        metadata: { title: newPost.title }
      });

      res.status(201).json(newPost);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/discussions', async (req, res, next) => {
    try {
      const { course, tags } = req.query;
      const filters: any = {};
      
      if (course) filters.course = course;
      if (tags) filters.tags = tags;
      
      const posts = await storage.getDiscussionPosts(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(posts);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/discussions/:id', async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getDiscussionPost(postId);
      
      if (!post) {
        return res.status(404).send('Discussion post not found');
      }
      
      res.json(post);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/discussions/:id/replies', isAuthenticated, async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getDiscussionPost(postId);
      
      if (!post) {
        return res.status(404).send('Discussion post not found');
      }
      
      const replyData = insertDiscussionReplySchema.parse({
        ...req.body,
        postId,
        authorId: req.user.id
      });

      const newReply = await storage.createDiscussionReply(replyData);
      res.status(201).json(newReply);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/discussions/:id/replies', async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      const replies = await storage.getDiscussionReplies(postId);
      res.json(replies);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/discussions/:id/vote', isAuthenticated, async (req, res, next) => {
    try {
      const postId = parseInt(req.params.id);
      const { value } = req.body;
      
      if (value !== 1 && value !== -1) {
        return res.status(400).send('Vote value must be 1 or -1');
      }
      
      const updatedPost = await storage.voteDiscussionPost(postId, value);
      
      if (!updatedPost) {
        return res.status(404).send('Discussion post not found');
      }
      
      res.json(updatedPost);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/discussions/replies/:id/vote', isAuthenticated, async (req, res, next) => {
    try {
      const replyId = parseInt(req.params.id);
      const { value } = req.body;
      
      if (value !== 1 && value !== -1) {
        return res.status(400).send('Vote value must be 1 or -1');
      }
      
      const updatedReply = await storage.voteDiscussionReply(replyId, value);
      
      if (!updatedReply) {
        return res.status(404).send('Reply not found');
      }
      
      res.json(updatedReply);
    } catch (error) {
      next(error);
    }
  });

  // Study Resources API - Endpoints kept for backwards compatibility but returning 404
  app.post('/api/resources', isAuthenticated, upload.single('file'), async (req, res, next) => {
    console.log("Resource endpoints have been deprecated");
    return res.status(404).send('Resource functionality has been removed');
  });

  app.get('/api/resources', async (req, res, next) => {
    console.log("Resource endpoints have been deprecated");
    return res.status(404).json([]);
  });

  app.get('/api/resources/:id', async (req, res, next) => {
    console.log("Resource endpoints have been deprecated");
    return res.status(404).send('Resource functionality has been removed');
  });

  app.post('/api/resources/:id/download', async (req, res, next) => {
    console.log("Resource endpoints have been deprecated");
    return res.status(404).send('Resource functionality has been removed');
  });

  app.post('/api/resources/:id/rate', isAuthenticated, async (req, res, next) => {
    console.log("Resource endpoints have been deprecated");
    return res.status(404).send('Resource functionality has been removed');
  });

  // Study Groups API
  app.post('/api/groups', isAuthenticated, async (req, res, next) => {
    try {
      const groupData = insertStudyGroupSchema.parse({
        ...req.body,
        creatorId: req.user.id
      });

      const newGroup = await storage.createStudyGroup(groupData);

      // Add creator as a member and admin of the group
      await storage.addStudyGroupMember({
        groupId: newGroup.id,
        userId: req.user.id,
        isAdmin: true
      });

      // Create an activity entry for this group
      await storage.createActivity({
        userId: req.user.id,
        type: 'group_created',
        targetId: newGroup.id,
        targetType: 'study_group',
        metadata: { name: newGroup.name }
      });

      res.status(201).json(newGroup);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/groups', async (req, res, next) => {
    try {
      const { course } = req.query;
      const filters: any = {};
      
      if (course) filters.course = course;
      
      const groups = await storage.getStudyGroups(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(groups);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/groups/:id', async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getStudyGroup(groupId);
      
      if (!group) {
        return res.status(404).send('Study group not found');
      }
      
      res.json(group);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/groups/user/:userId', isAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Only allow users to see their own groups or administrators
      if (userId !== req.user.id) {
        return res.status(403).send('You are not authorized to view these groups');
      }
      
      const groups = await storage.getUserStudyGroups(userId);
      res.json(groups);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/groups/:id/members', isAuthenticated, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getStudyGroup(groupId);
      
      if (!group) {
        return res.status(404).send('Study group not found');
      }
      
      const memberData = insertStudyGroupMemberSchema.parse({
        ...req.body,
        groupId
      });

      const newMember = await storage.addStudyGroupMember(memberData);

      // Create an activity entry for joining the group
      await storage.createActivity({
        userId: memberData.userId,
        type: 'group_joined',
        targetId: groupId,
        targetType: 'study_group',
        metadata: { name: group.name }
      });

      res.status(201).json(newMember);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/groups/:id/members', async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const members = await storage.getStudyGroupMembers(groupId);
      res.json(members);
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/groups/:groupId/members/:userId', isAuthenticated, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = parseInt(req.params.userId);
      
      // Check if user is removing themselves or is an admin of the group
      const members = await storage.getStudyGroupMembers(groupId);
      const requestingUserMembership = members.find(m => m.userId === req.user.id);
      
      if (userId !== req.user.id && (!requestingUserMembership || !requestingUserMembership.isAdmin)) {
        return res.status(403).send('You are not authorized to remove this member');
      }
      
      const result = await storage.removeStudyGroupMember(groupId, userId);
      
      if (!result) {
        return res.status(404).send('Member not found in group');
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Study Sessions API
  app.post('/api/groups/:id/sessions', isAuthenticated, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getStudyGroup(groupId);
      
      if (!group) {
        return res.status(404).send('Study group not found');
      }
      
      // Check if user is a member of the group
      const members = await storage.getStudyGroupMembers(groupId);
      const isMember = members.some(m => m.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).send('You must be a member of the group to create a session');
      }
      
      const sessionData = insertStudySessionSchema.parse({
        ...req.body,
        groupId,
        createdBy: req.user.id
      });

      const newSession = await storage.createStudySession(sessionData);

      // Create an activity entry for this session
      await storage.createActivity({
        userId: req.user.id,
        type: 'session_created',
        targetId: newSession.id,
        targetType: 'study_session',
        metadata: { title: newSession.title, groupName: group.name }
      });

      res.status(201).json(newSession);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      next(error);
    }
  });

  app.get('/api/groups/:id/sessions', async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.id);
      const sessions = await storage.getStudySessions(groupId);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/sessions/upcoming', isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getUpcomingStudySessions(userId);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/sessions', isAuthenticated, async (req, res, next) => {
    try {
      // Get all study sessions from all groups the user is a member of
      const userId = req.user.id;
      const userGroups = await storage.getUserStudyGroups(userId);
      let allSessions = [];
      
      // Gather sessions from all user's groups
      for (const group of userGroups) {
        const groupSessions = await storage.getStudySessions(group.id);
        allSessions = [...allSessions, ...groupSessions];
      }
      
      // Sort by start time (newest first)
      allSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      res.json(allSessions);
    } catch (error) {
      next(error);
    }
  });

  // Activity Feed API
  app.get('/api/activities', async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/activities/user/:userId', isAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Only allow users to see their own activities or administrators
      if (userId !== req.user.id) {
        return res.status(403).send('You are not authorized to view these activities');
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getUserActivities(userId, limit);
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  // Theme API endpoint
  app.post('/api/theme', isAuthenticated, async (req, res, next) => {
    try {
      const { primary, variant, appearance, radius } = req.body;
      
      // Basic validation
      if (!primary || !variant || !appearance || typeof radius !== 'number') {
        return res.status(400).json({ error: 'Missing or invalid theme settings' });
      }
      
      // Validate specific enum values
      const validVariants = ['professional', 'tint', 'vibrant'];
      const validAppearances = ['light', 'dark', 'system'];
      
      if (!validVariants.includes(variant)) {
        return res.status(400).json({ error: 'Invalid variant value' });
      }
      
      if (!validAppearances.includes(appearance)) {
        return res.status(400).json({ error: 'Invalid appearance value' });
      }
      
      // Write theme settings to file
      const themeSettings = {
        primary,
        variant,
        appearance,
        radius
      };
      
      fs.writeFileSync(
        path.join(process.cwd(), 'theme.json'), 
        JSON.stringify(themeSettings, null, 2)
      );
      
      res.status(200).json({ success: true, theme: themeSettings });
      
    } catch (error) {
      next(error);
    }
  });

  // Search routes
  app.get("/api/search/papers", async (req, res, next) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      
      const papers = await storage.getPapers();
      const results = papers.filter(paper => 
        paper.title.toLowerCase().includes(query.toLowerCase()) ||
        (paper.description && paper.description.toLowerCase().includes(query.toLowerCase())) ||
        (paper.course && paper.course.toLowerCase().includes(query.toLowerCase()))
      );
      
      res.json(results);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/search/resources", async (req, res, next) => {
    console.log("Resource search has been deprecated");
    return res.json([]);
  });
  
  app.get("/api/search/discussions", async (req, res, next) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      
      const discussions = await storage.getDiscussionPosts();
      const results = discussions.filter(discussion => 
        discussion.title.toLowerCase().includes(query.toLowerCase()) ||
        discussion.content.toLowerCase().includes(query.toLowerCase()) ||
        (discussion.course && discussion.course.toLowerCase().includes(query.toLowerCase())) ||
        (discussion.tags && discussion.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
      );
      
      res.json(results);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/login", (req, res, next) => {
    console.log("Login request received:", req.body);
    passport.authenticate("local", (err, user) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed: Invalid credentials");
        // Check if this is a direct form submission or API call
        if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
          return res.redirect('/auth?error=Invalid+credentials');
        }
        return res.status(401).send("Invalid credentials");
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return next(err);
        }
        
        // Remove password from response
        const userResponse = { ...user };
        delete userResponse.password;
        
        console.log("Login successful for user:", userResponse.username);
        console.log("Session ID after login:", req.sessionID);
        
        // Check if this is a direct form submission or API call
        if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
          // Set a cookie manually to make sure it's there
          res.cookie('connect.sid', req.sessionID, {
            path: '/',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 1 day
          });
          
          // Use the redirect parameter if provided, otherwise go to home
          return res.redirect(req.body.redirect || '/');
        }
        
        // API response for programmatic calls
        res.status(200).json(userResponse);
      });
    })(req, res, next);
  });
  
  // Add a direct login page that doesn't rely on client-side code
  app.get("/direct-login", (req, res) => {
    // Already logged in? Redirect to home
    if (req.isAuthenticated()) {
      return res.redirect('/');
    }
    
    // Simple HTML login form
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>StudySphere - Direct Login</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; }
          h1 { color: #333; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input[type="text"], input[type="password"] { width: 100%; padding: 8px; box-sizing: border-box; }
          button { padding: 10px 15px; background: #4a5568; color: white; border: none; cursor: pointer; }
          .error { color: red; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <h1>StudySphere Direct Login</h1>
        <p>This is a simplified login that bypasses React.</p>
        
        ${req.query.error ? `<div class="error">${req.query.error}</div>` : ''}
        
        <form action="/api/login" method="POST">
          <div class="form-group">
            <label for="username">Username or Email:</label>
            <input type="text" id="username" name="username" required>
          </div>
          
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
          </div>
          
          <input type="hidden" name="redirect" value="/">
          
          <button type="submit">Login</button>
        </form>
        
        <p><a href="/">Back to main app</a></p>
      </body>
      </html>
    `);
  });
  
  // Add a direct registration page
  app.get("/direct-register", (req, res) => {
    // Already logged in? Redirect to home
    if (req.isAuthenticated()) {
      return res.redirect('/');
    }
    
    // Simple HTML registration form
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>StudySphere - Direct Registration</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; }
          h1 { color: #333; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input[type="text"], input[type="password"], input[type="email"], input[type="number"] { 
            width: 100%; padding: 8px; box-sizing: border-box; 
          }
          button { padding: 10px 15px; background: #4a5568; color: white; border: none; cursor: pointer; }
          .error { color: red; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <h1>StudySphere Direct Registration</h1>
        <p>This is a simplified registration that bypasses React.</p>
        
        ${req.query.error ? `<div class="error">${req.query.error}</div>` : ''}
        
        <form action="/api/direct-register" method="POST">
          <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" name="username" required>
          </div>
          
          <div class="form-group">
            <label for="displayName">Display Name:</label>
            <input type="text" id="displayName" name="displayName" required>
          </div>
          
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
          </div>
          
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required minlength="8">
          </div>
          
          <div class="form-group">
            <label for="institution">Institution:</label>
            <input type="text" id="institution" name="institution" required>
          </div>
          
          <div class="form-group">
            <label for="yearOfStudy">Year of Study:</label>
            <input type="number" id="yearOfStudy" name="yearOfStudy" min="1">
          </div>
          
          <button type="submit">Register</button>
        </form>
        
        <p><a href="/direct-login">Already have an account? Log in</a></p>
        <p><a href="/">Back to main app</a></p>
      </body>
      </html>
    `);
  });
  
  // Add a direct registration handler
  app.post("/api/direct-register", async (req, res, next) => {
    try {
      // Check if username exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.redirect('/direct-register?error=Username+already+exists');
      }
      
      // Check if email exists
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.redirect('/direct-register?error=Email+already+exists');
      }

      // Create new user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Login user after registration
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Set a cookie manually to make sure it's there
        res.cookie('connect.sid', req.sessionID, {
          path: '/',
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        
        res.redirect('/');
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.redirect('/direct-register?error=Registration+failed');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
