import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { hashPassword, comparePassword } from "./utils";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "studysphere-secret",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      secure: false, // Set to false to work in development without HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    }
  };

  console.log("Setting up auth with session config:", {
    secret: sessionSettings.secret ? "****" : "Not set",
    resave: sessionSettings.resave,
    saveUninitialized: sessionSettings.saveUninitialized,
    cookie: sessionSettings.cookie
  });

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Add debug middleware to check session and authentication status
  app.use((req, res, next) => {
    console.log(`Session ID: ${req.sessionID}, Authenticated: ${req.isAuthenticated()}`);
    if (req.isAuthenticated()) {
      console.log(`Authenticated User: ${req.user.username} (ID: ${req.user.id})`);
    }
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Check if input is an email
        const isEmail = username.includes('@');
        
        let user;
        if (isEmail) {
          user = await storage.getUserByEmail(username);
        } else {
          user = await storage.getUserByUsername(username);
        }
        
        if (!user) {
          console.log(`User not found for ${username}`);
          return done(null, false);
        }
        
        const passwordMatches = await comparePassword(password, user.password);
        if (!passwordMatches) {
          console.log(`Password mismatch for user ${username}`);
          return done(null, false);
        }
        
        console.log(`Successful login for user ${username}`);
        return done(null, user);
      } catch (error) {
        console.error(`Login error: ${error.message}`);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`User ID ${id} not found during deserialization`);
        return done(null, false);
      }
      console.log(`User ${user.username} deserialized successfully`);
      done(null, user);
    } catch (error) {
      console.error(`Deserialization error: ${error.message}`);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log(`Registration attempt for username: ${req.body.username}, email: ${req.body.email}`);
      
      // Check if username exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log(`Registration failed: Username ${req.body.username} already exists`);
        return res.status(400).send("Username already exists");
      }
      
      // Check if email exists
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        console.log(`Registration failed: Email ${req.body.email} already exists`);
        return res.status(400).send("Email already exists");
      }

      const hashedPassword = await hashPassword(req.body.password);
      console.log(`Password hashed successfully`);

      // Create new user with hashed password
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      console.log(`User created with ID: ${user.id}`);

      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.password;

      // Login user after registration
      req.login(user, (err) => {
        if (err) {
          console.error(`Login after registration failed: ${err.message}`);
          return next(err);
        }
        console.log(`User ${user.username} logged in after registration`);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      console.error(`Registration error: ${error.message}`);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log(`Login attempt for: ${req.body.username}`);
    
    passport.authenticate("local", (err, user) => {
      if (err) {
        console.error(`Authentication error: ${err.message}`);
        return next(err);
      }
      
      if (!user) {
        console.log(`Authentication failed for ${req.body.username}`);
        return res.status(401).send("Invalid credentials");
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error(`Session creation error: ${err.message}`);
          return next(err);
        }
        
        console.log(`Login successful for ${user.username}, session ID: ${req.sessionID}`);
        
        // Remove password from response
        const userResponse = { ...user };
        delete userResponse.password;
        
        // Check content type to determine if this is a form submission or API call
        const isFormSubmission = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
        
        if (isFormSubmission) {
          // Set a cookie manually to ensure it's properly established
          res.cookie('connect.sid', req.sessionID, {
            path: '/',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 1 day
          });
          
          // Redirect to requested page or home
          const redirectTo = req.body.redirect || '/';
          console.log(`Form login - redirecting to: ${redirectTo}`);
          return res.redirect(redirectTo);
        }
        
        // API response
        console.log(`API login - sending JSON response`);
        res.status(200).json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    if (req.isAuthenticated()) {
      console.log(`Logging out user: ${req.user.username}`);
    }
    
    req.logout((err) => {
      if (err) {
        console.error(`Logout error: ${err.message}`);
        return next(err);
      }
      console.log(`Logout successful, session destroyed`);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log(`User check: Not authenticated`);
      return res.sendStatus(401);
    }
    
    console.log(`User check: Authenticated as ${req.user.username}`);
    
    // Remove password from response
    const userResponse = { ...req.user };
    delete userResponse.password;
    
    res.json(userResponse);
  });
}
