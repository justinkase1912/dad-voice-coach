import { pgTable, text, varchar, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const voiceAnalysisSchema = z.object({
  pitchAccuracy: z.number().min(0).max(100),
  toneStability: z.number().min(0).max(100),
  breathSupport: z.number().min(0).max(100),
  strainRisk: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
});

export type VoiceAnalysis = z.infer<typeof voiceAnalysisSchema>;

export const coachingFeedbackSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  exercises: z.array(z.object({
    name: z.string(),
    description: z.string(),
    duration: z.string(),
  })),
  encouragement: z.string(),
});

export type CoachingFeedback = z.infer<typeof coachingFeedbackSchema>;

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  duration: text("duration").notNull(),
  transcript: text("transcript"),
  analysis: jsonb("analysis").$type<VoiceAnalysis>(),
  feedback: jsonb("feedback").$type<CoachingFeedback>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  createdAt: true,
});

export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
