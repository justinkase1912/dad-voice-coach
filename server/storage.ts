import { type User, type InsertUser, type Recording, type InsertRecording, type VoiceAnalysis, type CoachingFeedback, type VocalRangeRecord, type InsertVocalRange } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getRecording(id: number): Promise<Recording | undefined>;
  getAllRecordings(): Promise<Recording[]>;
  createRecording(recording: InsertRecording): Promise<Recording>;
  updateRecording(id: number, analysis: VoiceAnalysis, feedback: CoachingFeedback): Promise<Recording | undefined>;
  deleteRecording(id: number): Promise<void>;
  
  getVocalRange(): Promise<VocalRangeRecord | undefined>;
  saveVocalRange(range: InsertVocalRange): Promise<VocalRangeRecord>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private recordings: Map<number, Recording>;
  private recordingIdCounter: number;
  private vocalRange: VocalRangeRecord | undefined;
  private vocalRangeIdCounter: number;

  constructor() {
    this.users = new Map();
    this.recordings = new Map();
    this.recordingIdCounter = 1;
    this.vocalRangeIdCounter = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }

  async getAllRecordings(): Promise<Recording[]> {
    return Array.from(this.recordings.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const id = this.recordingIdCounter++;
    const recording: Recording = {
      id,
      title: insertRecording.title,
      duration: insertRecording.duration,
      transcript: insertRecording.transcript ?? null,
      analysis: insertRecording.analysis ?? null,
      feedback: insertRecording.feedback ?? null,
      createdAt: new Date(),
    };
    this.recordings.set(id, recording);
    return recording;
  }

  async updateRecording(id: number, analysis: VoiceAnalysis, feedback: CoachingFeedback): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updated: Recording = {
      ...recording,
      analysis,
      feedback,
    };
    this.recordings.set(id, updated);
    return updated;
  }

  async deleteRecording(id: number): Promise<void> {
    this.recordings.delete(id);
  }

  async getVocalRange(): Promise<VocalRangeRecord | undefined> {
    return this.vocalRange;
  }

  async saveVocalRange(range: InsertVocalRange): Promise<VocalRangeRecord> {
    const id = this.vocalRangeIdCounter++;
    this.vocalRange = {
      ...range,
      id,
      createdAt: new Date(),
    };
    return this.vocalRange;
  }
}

export const storage = new MemStorage();
