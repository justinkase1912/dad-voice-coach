import { useState, useEffect, useCallback } from "react";
import { Music, Play, Square, RotateCcw, CheckCircle2, ArrowDown, ArrowUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PianoKeyboard } from "./piano-keyboard";
import { 
  PitchDetector, 
  type PitchResult, 
  noteToString, 
  getVoiceType, 
  getSuggestedKeys 
} from "@/lib/pitch-detection";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { VocalRangeRecord } from "@shared/schema";

type TestPhase = "idle" | "intro-low" | "low" | "intro-high" | "high" | "complete";

interface DetectedNote {
  note: string;
  octave: number;
  frequency: number;
  count: number;
}

const INSTRUCTIONS = {
  introLow: {
    title: "Finding Your Lowest Note",
    steps: [
      "Stand or sit up straight with relaxed shoulders",
      "Take a deep breath from your belly, not your chest", 
      "Start with a comfortable low note on 'Ahh'",
      "Slowly slide your voice lower, like a gentle siren going down",
      "Stop when your voice becomes breathy or cracks - that's your limit"
    ],
    tip: "Don't push or strain. Your lowest usable note should still sound clear."
  },
  introHigh: {
    title: "Finding Your Highest Note", 
    steps: [
      "Shake out any tension in your neck and jaw",
      "Take another deep belly breath",
      "Start at a comfortable pitch on 'Ee' or 'Ahh'",
      "Gradually slide your voice higher, like a siren going up",
      "Stop when your voice flips to falsetto or strains"
    ],
    tip: "Keep your throat open and relaxed. If it hurts, you've gone too far."
  }
};

export function RangeFinder({ selectedDeviceId }: { selectedDeviceId?: string }) {
  const [phase, setPhase] = useState<TestPhase>("idle");
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null);
  const [detectedNotes, setDetectedNotes] = useState<DetectedNote[]>([]);
  const [lowestNote, setLowestNote] = useState<DetectedNote | null>(null);
  const [highestNote, setHighestNote] = useState<DetectedNote | null>(null);
  const [detector, setDetector] = useState<PitchDetector | null>(null);
  const [progress, setProgress] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  const { data: savedRange } = useQuery<VocalRangeRecord | null>({
    queryKey: ['/api/vocal-range'],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: {
      lowestNote: string;
      highestNote: string;
      lowestFrequency: number;
      highestFrequency: number;
      comfortableLow: string;
      comfortableHigh: string;
      voiceType: string;
      suggestedKeys: string[];
    }) => {
      const response = await apiRequest('POST', '/api/vocal-range', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vocal-range'] });
    },
  });

  const handlePitch = useCallback((result: PitchResult | null) => {
    setCurrentPitch(result);
    
    if (result && result.confidence > 0.1) {
      setDetectedNotes(prev => {
        const existing = prev.find(n => n.note === result.note && n.octave === result.octave);
        if (existing) {
          return prev.map(n => 
            n.note === result.note && n.octave === result.octave 
              ? { ...n, count: n.count + 1 }
              : n
          );
        }
        return [...prev, { 
          note: result.note, 
          octave: result.octave, 
          frequency: result.frequency,
          count: 1 
        }];
      });
    }
  }, []);

  const startPhase = async (targetPhase: "low" | "high") => {
    setPhase(targetPhase);
    setDetectedNotes([]);
    setProgress(0);
    setError(null);
    
    const pitchDetector = new PitchDetector();
    setDetector(pitchDetector);
    
    try {
      await pitchDetector.start(selectedDeviceId, handlePitch);
    } catch (err) {
      console.error("Failed to start pitch detection:", err);
      setError("Could not access microphone. Please check permissions and try again.");
      setPhase("idle");
      setDetector(null);
      return;
    }
    
    const duration = 12000;
    const interval = 100;
    let elapsed = 0;
    
    const progressIntervalId = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);
      
      if (elapsed >= duration) {
        clearInterval(progressIntervalId);
        setIntervalId(null);
        pitchDetector.stop();
        setDetector(null);
        
        setDetectedNotes(prev => {
          const sorted = [...prev].sort((a, b) => a.frequency - b.frequency);
          const significant = sorted.filter(n => n.count >= 3);
          
          if (significant.length > 0) {
            if (targetPhase === "low") {
              setLowestNote(significant[0]);
            } else {
              setHighestNote(significant[significant.length - 1]);
            }
          }
          
          return prev;
        });
        
        if (targetPhase === "low") {
          setPhase("idle");
        } else {
          setPhase("complete");
        }
      }
    }, interval);
    
    setIntervalId(progressIntervalId);
  };

  const stopTest = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    if (detector) {
      detector.stop();
      setDetector(null);
    }
    setPhase("idle");
    setProgress(0);
  };

  const resetTest = () => {
    setLowestNote(null);
    setHighestNote(null);
    setDetectedNotes([]);
    setPhase("idle");
    setProgress(0);
  };

  const saveResults = () => {
    if (!lowestNote || !highestNote) return;
    
    const lowStr = noteToString(lowestNote.note, lowestNote.octave);
    const highStr = noteToString(highestNote.note, highestNote.octave);
    const voiceType = getVoiceType(lowStr, highStr);
    const suggestedKeys = getSuggestedKeys(lowStr, highStr);
    
    saveMutation.mutate({
      lowestNote: lowStr,
      highestNote: highStr,
      lowestFrequency: lowestNote.frequency,
      highestFrequency: highestNote.frequency,
      comfortableLow: lowStr,
      comfortableHigh: highStr,
      voiceType,
      suggestedKeys,
    });
  };

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (detector) {
        detector.stop();
      }
    };
  }, [detector, intervalId]);

  const renderInstructions = (type: "introLow" | "introHigh") => {
    const instructions = INSTRUCTIONS[type];
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-center">{instructions.title}</h3>
        <ol className="space-y-2 text-sm">
          {instructions.steps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-sm">
          <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="text-muted-foreground">{instructions.tip}</span>
        </div>
      </div>
    );
  };

  if (savedRange && phase === "idle" && !lowestNote && !highestNote) {
    return (
      <Card className="overflow-visible">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="h-5 w-5 text-primary" />
            Your Vocal Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PianoKeyboard
            lowestNote={savedRange.lowestNote}
            highestNote={savedRange.highestNote}
            showLabels={true}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Lowest</div>
              <div className="text-2xl font-bold text-primary">{savedRange.lowestNote}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Highest</div>
              <div className="text-2xl font-bold text-primary">{savedRange.highestNote}</div>
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <div className="text-xs text-muted-foreground mb-1">Voice Type</div>
            <div className="text-lg font-semibold">{savedRange.voiceType}</div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-2">Suggested Keys</div>
            <div className="flex justify-center gap-2">
              {savedRange.suggestedKeys.map((key) => (
                <span 
                  key={key} 
                  className="px-3 py-1 rounded-full bg-primary/20 text-sm font-medium"
                >
                  {key}
                </span>
              ))}
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={resetTest}
            data-testid="button-retest-range"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Test Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Music className="h-5 w-5 text-primary" />
          {phase === "idle" && !lowestNote ? "Find Your Range" : 
           phase === "intro-low" ? "Get Ready" :
           phase === "intro-high" ? "Get Ready" :
           "Range Test"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "idle" && !lowestNote && !highestNote && (
          <>
            <p className="text-sm text-muted-foreground text-center">
              Discover your natural vocal range to find the best keys for your voice. This takes about 2 minutes.
            </p>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button 
              className="w-full" 
              onClick={() => setPhase("intro-low")}
              data-testid="button-start-range-test"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Range Test
            </Button>
          </>
        )}

        {phase === "intro-low" && (
          <>
            {renderInstructions("introLow")}
            <Button 
              className="w-full" 
              onClick={() => startPhase("low")}
              data-testid="button-begin-low-test"
            >
              <Play className="h-4 w-4 mr-2" />
              I'm Ready - Start Recording
            </Button>
          </>
        )}

        {phase === "intro-high" && (
          <>
            {renderInstructions("introHigh")}
            <Button 
              className="w-full" 
              onClick={() => startPhase("high")}
              data-testid="button-begin-high-test"
            >
              <Play className="h-4 w-4 mr-2" />
              I'm Ready - Start Recording
            </Button>
          </>
        )}

        {phase === "idle" && lowestNote && !highestNote && (
          <>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Lowest Note Found
              </div>
              <div className="text-3xl font-bold text-primary">
                {noteToString(lowestNote.note, lowestNote.octave)}
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Great! Now let's find your highest comfortable note.
            </p>
            <Button 
              className="w-full" 
              onClick={() => setPhase("intro-high")}
              data-testid="button-test-high"
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Continue to High Range
            </Button>
          </>
        )}

        {(phase === "low" || phase === "high") && (
          <>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">
                {phase === "low" 
                  ? "Sing from comfortable to your LOWEST note" 
                  : "Sing from comfortable to your HIGHEST note"}
              </p>
              <p className="text-xs text-muted-foreground">
                {phase === "low"
                  ? "Slide down slowly like a gentle siren"
                  : "Slide up slowly, stop before straining"}
              </p>
            </div>
            
            <PianoKeyboard
              currentNote={currentPitch?.note}
              currentOctave={currentPitch?.octave}
              cents={currentPitch?.cents}
            />
            
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.max(0, Math.ceil(12 - (progress / 100) * 12))} seconds remaining
            </p>
            
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={stopTest}
              data-testid="button-stop-range-test"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </>
        )}

        {phase === "complete" && lowestNote && highestNote && (
          <>
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Range Test Complete!</span>
            </div>

            <PianoKeyboard
              lowestNote={noteToString(lowestNote.note, lowestNote.octave)}
              highestNote={noteToString(highestNote.note, highestNote.octave)}
              showLabels={true}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                  <ArrowDown className="h-3 w-3" />
                  Lowest
                </div>
                <div className="text-2xl font-bold text-primary">
                  {noteToString(lowestNote.note, lowestNote.octave)}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                  <ArrowUp className="h-3 w-3" />
                  Highest
                </div>
                <div className="text-2xl font-bold text-primary">
                  {noteToString(highestNote.note, highestNote.octave)}
                </div>
              </div>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <div className="text-xs text-muted-foreground mb-1">Voice Type</div>
              <div className="text-lg font-semibold">
                {getVoiceType(
                  noteToString(lowestNote.note, lowestNote.octave),
                  noteToString(highestNote.note, highestNote.octave)
                )}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">Suggested Keys</div>
              <div className="flex justify-center gap-2">
                {getSuggestedKeys(
                  noteToString(lowestNote.note, lowestNote.octave),
                  noteToString(highestNote.note, highestNote.octave)
                ).map((key) => (
                  <span 
                    key={key} 
                    className="px-3 py-1 rounded-full bg-primary/20 text-sm font-medium"
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={resetTest}
                data-testid="button-reset-range"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Redo
              </Button>
              <Button 
                className="flex-1" 
                onClick={saveResults}
                disabled={saveMutation.isPending}
                data-testid="button-save-range"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
