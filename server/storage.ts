import { users, type User, type InsertUser, papers, type Paper, type InsertPaper, discussionPosts, type DiscussionPost, type InsertDiscussionPost, discussionReplies, type DiscussionReply, type InsertDiscussionReply, resources, type Resource, type InsertResource, studyGroups, type StudyGroup, type InsertStudyGroup, studyGroupMembers, type StudyGroupMember, type InsertStudyGroupMember, studySessions, type StudySession, type InsertStudySession, activities, type Activity, type InsertActivity } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Paper operations
  createPaper(paper: InsertPaper): Promise<Paper>;
  getPaper(id: number): Promise<Paper | undefined>;
  getPapers(filters?: Partial<Paper>): Promise<Paper[]>;
  incrementPaperDownloads(id: number): Promise<Paper | undefined>;
  
  // Discussion operations
  createDiscussionPost(post: InsertDiscussionPost): Promise<DiscussionPost>;
  getDiscussionPost(id: number): Promise<DiscussionPost | undefined>;
  getDiscussionPosts(filters?: Partial<DiscussionPost>): Promise<DiscussionPost[]>;
  createDiscussionReply(reply: InsertDiscussionReply): Promise<DiscussionReply>;
  getDiscussionReplies(postId: number): Promise<DiscussionReply[]>;
  voteDiscussionPost(id: number, value: number): Promise<DiscussionPost | undefined>;
  voteDiscussionReply(id: number, value: number): Promise<DiscussionReply | undefined>;
  
  // Resource operations
  createResource(resource: InsertResource): Promise<Resource>;
  getResource(id: number): Promise<Resource | undefined>;
  getResources(filters?: Partial<Resource>): Promise<Resource[]>;
  incrementResourceDownloads(id: number): Promise<Resource | undefined>;
  rateResource(id: number, rating: number): Promise<Resource | undefined>;
  
  // Study group operations
  createStudyGroup(group: InsertStudyGroup): Promise<StudyGroup>;
  getStudyGroup(id: number): Promise<StudyGroup | undefined>;
  getStudyGroups(filters?: Partial<StudyGroup>): Promise<StudyGroup[]>;
  getUserStudyGroups(userId: number): Promise<StudyGroup[]>;
  
  // Study group member operations
  addStudyGroupMember(member: InsertStudyGroupMember): Promise<StudyGroupMember>;
  getStudyGroupMembers(groupId: number): Promise<StudyGroupMember[]>;
  removeStudyGroupMember(groupId: number, userId: number): Promise<boolean>;
  
  // Study session operations
  createStudySession(session: InsertStudySession): Promise<StudySession>;
  getStudySession(id: number): Promise<StudySession | undefined>;
  getStudySessions(groupId: number): Promise<StudySession[]>;
  getUpcomingStudySessions(userId: number): Promise<StudySession[]>;
  
  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getUserActivities(userId: number, limit?: number): Promise<Activity[]>;
  getRecentActivities(limit?: number): Promise<Activity[]>;
  
  // Session store for authentication
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private papers: Map<number, Paper>;
  private discussionPosts: Map<number, DiscussionPost>;
  private discussionReplies: Map<number, DiscussionReply>;
  private resources: Map<number, Resource>;
  private studyGroups: Map<number, StudyGroup>;
  private studyGroupMembers: Map<number, StudyGroupMember>;
  private studySessions: Map<number, StudySession>;
  private activities: Map<number, Activity>;
  
  sessionStore: session.SessionStore;
  
  currentUserId: number;
  currentPaperId: number;
  currentDiscussionPostId: number;
  currentDiscussionReplyId: number;
  currentResourceId: number;
  currentStudyGroupId: number;
  currentStudyGroupMemberId: number;
  currentStudySessionId: number;
  currentActivityId: number;

  constructor() {
    this.users = new Map();
    this.papers = new Map();
    this.discussionPosts = new Map();
    this.discussionReplies = new Map();
    this.resources = new Map();
    this.studyGroups = new Map();
    this.studyGroupMembers = new Map();
    this.studySessions = new Map();
    this.activities = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    this.currentUserId = 1;
    this.currentPaperId = 1;
    this.currentDiscussionPostId = 1;
    this.currentDiscussionReplyId = 1;
    this.currentResourceId = 1;
    this.currentStudyGroupId = 1;
    this.currentStudyGroupMemberId = 1;
    this.currentStudySessionId = 1;
    this.currentActivityId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now,
      points: 0
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Paper operations
  async createPaper(paper: InsertPaper): Promise<Paper> {
    const id = this.currentPaperId++;
    const now = new Date();
    const newPaper: Paper = {
      ...paper,
      id,
      uploadDate: now,
      downloads: 0
    };
    this.papers.set(id, newPaper);
    return newPaper;
  }
  
  async getPaper(id: number): Promise<Paper | undefined> {
    return this.papers.get(id);
  }
  
  async getPapers(filters?: Partial<Paper>): Promise<Paper[]> {
    if (!filters) {
      return Array.from(this.papers.values());
    }
    
    return Array.from(this.papers.values()).filter(paper => {
      return Object.entries(filters).every(([key, value]) => {
        return paper[key as keyof Paper] === value;
      });
    });
  }
  
  async incrementPaperDownloads(id: number): Promise<Paper | undefined> {
    const paper = await this.getPaper(id);
    if (!paper) return undefined;
    
    const updatedPaper = { ...paper, downloads: paper.downloads + 1 };
    this.papers.set(id, updatedPaper);
    return updatedPaper;
  }

  // Discussion operations
  async createDiscussionPost(post: InsertDiscussionPost): Promise<DiscussionPost> {
    const id = this.currentDiscussionPostId++;
    const now = new Date();
    const newPost: DiscussionPost = {
      ...post,
      id,
      createdAt: now,
      updatedAt: now,
      votes: 0
    };
    this.discussionPosts.set(id, newPost);
    return newPost;
  }
  
  async getDiscussionPost(id: number): Promise<DiscussionPost | undefined> {
    return this.discussionPosts.get(id);
  }
  
  async getDiscussionPosts(filters?: Partial<DiscussionPost>): Promise<DiscussionPost[]> {
    if (!filters) {
      return Array.from(this.discussionPosts.values());
    }
    
    return Array.from(this.discussionPosts.values()).filter(post => {
      return Object.entries(filters).every(([key, value]) => {
        return post[key as keyof DiscussionPost] === value;
      });
    });
  }
  
  async createDiscussionReply(reply: InsertDiscussionReply): Promise<DiscussionReply> {
    const id = this.currentDiscussionReplyId++;
    const now = new Date();
    const newReply: DiscussionReply = {
      ...reply,
      id,
      createdAt: now,
      updatedAt: now,
      votes: 0
    };
    this.discussionReplies.set(id, newReply);
    return newReply;
  }
  
  async getDiscussionReplies(postId: number): Promise<DiscussionReply[]> {
    return Array.from(this.discussionReplies.values()).filter(
      (reply) => reply.postId === postId
    );
  }
  
  async voteDiscussionPost(id: number, value: number): Promise<DiscussionPost | undefined> {
    const post = await this.getDiscussionPost(id);
    if (!post) return undefined;
    
    const updatedPost = { ...post, votes: post.votes + value };
    this.discussionPosts.set(id, updatedPost);
    return updatedPost;
  }
  
  async voteDiscussionReply(id: number, value: number): Promise<DiscussionReply | undefined> {
    const reply = this.discussionReplies.get(id);
    if (!reply) return undefined;
    
    const updatedReply = { ...reply, votes: reply.votes + value };
    this.discussionReplies.set(id, updatedReply);
    return updatedReply;
  }

  // Resource operations
  async createResource(resource: InsertResource): Promise<Resource> {
    const id = this.currentResourceId++;
    const now = new Date();
    const newResource: Resource = {
      ...resource,
      id,
      uploadDate: now,
      downloads: 0,
      rating: 0
    };
    this.resources.set(id, newResource);
    return newResource;
  }
  
  async getResource(id: number): Promise<Resource | undefined> {
    return this.resources.get(id);
  }
  
  async getResources(filters?: Partial<Resource>): Promise<Resource[]> {
    if (!filters) {
      return Array.from(this.resources.values());
    }
    
    return Array.from(this.resources.values()).filter(resource => {
      return Object.entries(filters).every(([key, value]) => {
        return resource[key as keyof Resource] === value;
      });
    });
  }
  
  async incrementResourceDownloads(id: number): Promise<Resource | undefined> {
    const resource = await this.getResource(id);
    if (!resource) return undefined;
    
    const updatedResource = { ...resource, downloads: resource.downloads + 1 };
    this.resources.set(id, updatedResource);
    return updatedResource;
  }
  
  async rateResource(id: number, rating: number): Promise<Resource | undefined> {
    const resource = await this.getResource(id);
    if (!resource) return undefined;
    
    const updatedResource = { ...resource, rating };
    this.resources.set(id, updatedResource);
    return updatedResource;
  }

  // Study group operations
  async createStudyGroup(group: InsertStudyGroup): Promise<StudyGroup> {
    const id = this.currentStudyGroupId++;
    const now = new Date();
    const newGroup: StudyGroup = {
      ...group,
      id,
      createdAt: now
    };
    this.studyGroups.set(id, newGroup);
    return newGroup;
  }
  
  async getStudyGroup(id: number): Promise<StudyGroup | undefined> {
    return this.studyGroups.get(id);
  }
  
  async getStudyGroups(filters?: Partial<StudyGroup>): Promise<StudyGroup[]> {
    if (!filters) {
      return Array.from(this.studyGroups.values());
    }
    
    return Array.from(this.studyGroups.values()).filter(group => {
      return Object.entries(filters).every(([key, value]) => {
        return group[key as keyof StudyGroup] === value;
      });
    });
  }
  
  async getUserStudyGroups(userId: number): Promise<StudyGroup[]> {
    // Get all groups where user is a member
    const memberGroups = Array.from(this.studyGroupMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.groupId);
    
    return Array.from(this.studyGroups.values())
      .filter(group => memberGroups.includes(group.id));
  }

  // Study group member operations
  async addStudyGroupMember(member: InsertStudyGroupMember): Promise<StudyGroupMember> {
    const id = this.currentStudyGroupMemberId++;
    const now = new Date();
    const newMember: StudyGroupMember = {
      ...member,
      id,
      joinedAt: now
    };
    this.studyGroupMembers.set(id, newMember);
    return newMember;
  }
  
  async getStudyGroupMembers(groupId: number): Promise<StudyGroupMember[]> {
    return Array.from(this.studyGroupMembers.values())
      .filter(member => member.groupId === groupId);
  }
  
  async removeStudyGroupMember(groupId: number, userId: number): Promise<boolean> {
    const memberToDelete = Array.from(this.studyGroupMembers.values())
      .find(member => member.groupId === groupId && member.userId === userId);
    
    if (memberToDelete) {
      return this.studyGroupMembers.delete(memberToDelete.id);
    }
    
    return false;
  }

  // Study session operations
  async createStudySession(session: InsertStudySession): Promise<StudySession> {
    const id = this.currentStudySessionId++;
    const newSession: StudySession = {
      ...session,
      id
    };
    this.studySessions.set(id, newSession);
    return newSession;
  }
  
  async getStudySession(id: number): Promise<StudySession | undefined> {
    return this.studySessions.get(id);
  }
  
  async getStudySessions(groupId: number): Promise<StudySession[]> {
    return Array.from(this.studySessions.values())
      .filter(session => session.groupId === groupId);
  }
  
  async getUpcomingStudySessions(userId: number): Promise<StudySession[]> {
    // Get all groups where user is a member
    const memberGroups = Array.from(this.studyGroupMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.groupId);
    
    const now = new Date();
    return Array.from(this.studySessions.values())
      .filter(session => 
        memberGroups.includes(session.groupId) && 
        new Date(session.startTime) > now
      )
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  // Activity operations
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const now = new Date();
    const newActivity: Activity = {
      ...activity,
      id,
      createdAt: now
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }
  
  async getUserActivities(userId: number, limit?: number): Promise<Activity[]> {
    const userActivities = Array.from(this.activities.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? userActivities.slice(0, limit) : userActivities;
  }
  
  async getRecentActivities(limit?: number): Promise<Activity[]> {
    const allActivities = Array.from(this.activities.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? allActivities.slice(0, limit) : allActivities;
  }
}

export const storage = new MemStorage();
