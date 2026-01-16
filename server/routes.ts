import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI, { toFile } from "openai";
import { spawn, execSync } from "child_process";
import { voiceAnalysisSchema, coachingFeedbackSchema, type VoiceAnalysis, type CoachingFeedback } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

let ffmpegAvailable = false;

function checkFfmpegAvailability(): boolean {
  try {
    execSync("which ffmpeg", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function convertWebmToWav(webmBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (!ffmpegAvailable) {
      reject(new Error("Audio conversion is not available. Please try again later."));
      return;
    }

    const ffmpeg = spawn("ffmpeg", [
      "-i", "pipe:0",
      "-f", "wav",
      "-ar", "16000",
      "-ac", "1",
      "-acodec", "pcm_s16le",
      "pipe:1"
    ]);

    const chunks: Buffer[] = [];
    let errorOutput = "";

    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    ffmpeg.stderr.on("data", (data) => { errorOutput += data.toString(); });
    
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        console.error("FFmpeg error:", errorOutput);
        reject(new Error("Failed to process audio. Please try recording again."));
      }
    });
    
    ffmpeg.on("error", (err) => {
      console.error("FFmpeg spawn error:", err);
      reject(new Error("Audio processing is temporarily unavailable."));
    });

    ffmpeg.stdin.write(webmBuffer);
    ffmpeg.stdin.end();
  });
}

async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const file = await toFile(audioBuffer, "audio.wav");
    const response = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
    });
    return response.text;
  } catch (error) {
    console.error("Transcription error:", error);
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        throw new Error("Service is busy. Please wait a moment and try again.");
      }
      if (error.message.includes("Invalid file format")) {
        throw new Error("Audio format not supported. Please try recording again.");
      }
    }
    throw new Error("Unable to transcribe your recording. Please try again.");
  }
}

async function analyzeVoiceWithAI(transcript: string, duration: string): Promise<{ analysis: VoiceAnalysis; feedback: CoachingFeedback }> {
  const systemPrompt = `You are DadVoice Coach, an expert AI vocal coach specializing in helping singers find their clean singing voice. Your client has a strong background in punk/metal with a powerful low-mid growl, but is working on developing their clean/blues/alt-folk vocal delivery.

Key coaching context:
- Focus on helping them transition from aggressive vocal techniques to controlled clean delivery
- Emphasize breath support, diaphragm control, and reducing throat tension
- Encourage finding the "speaking voice sweet spot" for clean singing
- Address common issues: pushing too hard, throat strain, pitch inconsistency in clean passages

Analyze the provided singing transcript and provide detailed feedback. Consider:
1. Signs of strain or tension in the delivery (based on word patterns, phrasing)
2. Pitch and melodic consistency indicators
3. Breath control and phrase length
4. Tone quality and resonance placement hints
5. Overall vocal health and sustainable technique

Be encouraging but honest. This is someone who CAN sing - they just need guidance finding their clean voice.`;

  const userPrompt = `Please analyze this ${duration} vocal recording and provide coaching feedback.

Transcript of the singing:
"${transcript}"

Respond with a JSON object containing two parts:

1. "analysis" object with scores from 0-100:
   - pitchAccuracy: How consistent is the pitch? (consider melody adherence, note transitions)
   - toneStability: Is the tone steady or wavering? (vibrato control, sustained notes)
   - breathSupport: Signs of good diaphragmatic breathing? (phrase length, power consistency)
   - strainRisk: Risk of vocal strain from technique? (0 = no strain, 100 = high strain risk)
   - overallScore: Overall vocal performance rating

2. "feedback" object with:
   - summary: 2-3 sentences summarizing the performance
   - strengths: Array of 2-3 things they did well
   - improvements: Array of 2-3 specific areas to work on
   - exercises: Array of 2-3 practice exercises, each with:
     - name: Exercise name
     - description: How to do it
     - duration: How long to practice
   - encouragement: A motivating closing statement

Base your analysis on vocal coaching principles, considering this is someone transitioning from aggressive to clean vocal styles.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from AI coach");
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      throw new Error("Unable to process coaching feedback. Please try again.");
    }

    if (!parsed.analysis || !parsed.feedback) {
      console.error("Invalid response structure:", parsed);
      throw new Error("Incomplete coaching feedback received. Please try again.");
    }

    const analysis = voiceAnalysisSchema.parse(parsed.analysis);
    const feedback = coachingFeedbackSchema.parse(parsed.feedback);

    return { analysis, feedback };
  } catch (error) {
    console.error("Voice analysis error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("rate limit") || error.message.includes("429")) {
        throw new Error("The coaching service is busy. Please wait a moment and try again.");
      }
      if (error.message.includes("Invalid API")) {
        throw new Error("Coaching service configuration issue. Please contact support.");
      }
      if (error.message.includes("Unable to") || error.message.includes("Incomplete")) {
        throw error;
      }
    }
    
    throw new Error("Unable to generate coaching feedback. Please try again.");
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  ffmpegAvailable = checkFfmpegAvailability();
  console.log(`FFmpeg availability: ${ffmpegAvailable ? "available" : "not available"}`);

  app.get("/api/recordings", async (req, res) => {
    try {
      const recordings = await storage.getAllRecordings();
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  });

  app.get("/api/recordings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }
      res.json(recording);
    } catch (error) {
      console.error("Error fetching recording:", error);
      res.status(500).json({ error: "Failed to fetch recording" });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { audio, duration } = req.body;

      if (!audio) {
        return res.status(400).json({ error: "Audio data is required" });
      }

      if (!duration) {
        return res.status(400).json({ error: "Duration is required" });
      }

      if (!ffmpegAvailable) {
        return res.status(503).json({ 
          error: "Audio processing is temporarily unavailable. Please try again later." 
        });
      }

      let wavBuffer: Buffer;
      try {
        const webmBuffer = Buffer.from(audio, "base64");
        wavBuffer = await convertWebmToWav(webmBuffer);
      } catch (conversionError) {
        console.error("Audio conversion error:", conversionError);
        return res.status(400).json({ 
          error: conversionError instanceof Error 
            ? conversionError.message 
            : "Failed to process audio recording." 
        });
      }

      let transcript: string;
      try {
        transcript = await transcribeAudio(wavBuffer);
      } catch (transcriptionError) {
        console.error("Transcription error:", transcriptionError);
        return res.status(400).json({ 
          error: transcriptionError instanceof Error 
            ? transcriptionError.message 
            : "Failed to transcribe recording." 
        });
      }

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({ 
          error: "Could not detect any vocals. Please try recording again with clearer singing." 
        });
      }

      let analysis: VoiceAnalysis;
      let feedback: CoachingFeedback;
      try {
        const result = await analyzeVoiceWithAI(transcript, duration);
        analysis = result.analysis;
        feedback = result.feedback;
      } catch (analysisError) {
        console.error("Analysis error:", analysisError);
        return res.status(500).json({ 
          error: analysisError instanceof Error 
            ? analysisError.message 
            : "Failed to analyze your vocals." 
        });
      }

      const title = generateTitle(transcript);
      const recording = await storage.createRecording({
        title,
        duration,
        transcript,
        analysis,
        feedback,
      });

      res.json(recording);
    } catch (error) {
      console.error("Unexpected error in analyze endpoint:", error);
      res.status(500).json({ 
        error: "Something went wrong. Please try again." 
      });
    }
  });

  app.delete("/api/recordings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRecording(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting recording:", error);
      res.status(500).json({ error: "Failed to delete recording" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      ffmpeg: ffmpegAvailable,
      timestamp: new Date().toISOString()
    });
  });

  return httpServer;
}

function generateTitle(transcript: string): string {
  const words = transcript.split(/\s+/).slice(0, 5).join(" ");
  if (words.length > 30) {
    return words.substring(0, 27) + "...";
  }
  return words || "Vocal Session";
}
