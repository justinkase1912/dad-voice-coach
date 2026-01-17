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

export const vocalRangeSchema = z.object({
  lowestNote: z.string(),
  highestNote: z.string(),
  lowestFrequency: z.number(),
  highestFrequency: z.number(),
  comfortableLow: z.string(),
  comfortableHigh: z.string(),
  voiceType: z.string(),
  suggestedKeys: z.array(z.string()),
});

export type VocalRange = z.infer<typeof vocalRangeSchema>;

export const vocalRanges = pgTable("vocal_ranges", {
  id: serial("id").primaryKey(),
  lowestNote: text("lowest_note").notNull(),
  highestNote: text("highest_note").notNull(),
  lowestFrequency: text("lowest_frequency").notNull(),
  highestFrequency: text("highest_frequency").notNull(),
  comfortableLow: text("comfortable_low").notNull(),
  comfortableHigh: text("comfortable_high").notNull(),
  voiceType: text("voice_type").notNull(),
  suggestedKeys: jsonb("suggested_keys").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertVocalRangeSchema = createInsertSchema(vocalRanges).omit({
  id: true,
  createdAt: true,
});

export type VocalRangeRecord = typeof vocalRanges.$inferSelect;
export type InsertVocalRange = z.infer<typeof insertVocalRangeSchema>;
