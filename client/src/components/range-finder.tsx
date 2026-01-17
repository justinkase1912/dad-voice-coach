import { useState, useEffect, useCallback } from "react";
import { Music, Play, Square, RotateCcw, CheckCircle2, ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

type TestPhase = "idle" | "low" | "high" | "complete";

interface DetectedNote {
  note: string;
  octave: number;
  frequency: number;
  count: number;
}

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
      const noteStr = noteToString(result.note, result.octave);
      
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
      setError("Could not access microphone. Please check permissions.");
      setPhase("idle");
      setDetector(null);
      return;
    }
    
    const duration = 10000;
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

  const renderCurrentNote = () => {
    if (!currentPitch) {
      return <span className="text-muted-foreground">Listening...</span>;
    }
    return (
      <span className="text-4xl font-bold text-primary">
        {noteToString(currentPitch.note, currentPitch.octave)}
      </span>
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
          Find Your Range
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "idle" && !lowestNote && !highestNote && (
          <>
            <p className="text-sm text-muted-foreground text-center">
              Discover your natural vocal range and find the best keys for your voice.
            </p>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button 
              className="w-full" 
              onClick={() => startPhase("low")}
              data-testid="button-start-range-test"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Range Test
            </Button>
          </>
        )}

        {phase === "idle" && lowestNote && !highestNote && (
          <>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <ArrowDown className="h-4 w-4" />
                Lowest Note Found
              </div>
              <div className="text-3xl font-bold text-primary">
                {noteToString(lowestNote.note, lowestNote.octave)}
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Now let's find your highest comfortable note.
            </p>
            <Button 
              className="w-full" 
              onClick={() => startPhase("high")}
              data-testid="button-test-high"
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Test High Range
            </Button>
          </>
        )}

        {(phase === "low" || phase === "high") && (
          <>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                {phase === "low" 
                  ? "Sing your lowest comfortable note" 
                  : "Sing your highest comfortable note"}
              </p>
              <p className="text-xs text-muted-foreground">
                {phase === "low"
                  ? "Start low and gradually go lower"
                  : "Start comfortable and reach higher"}
              </p>
            </div>
            
            <div className="h-24 flex items-center justify-center">
              {renderCurrentNote()}
            </div>
            
            <Progress value={progress} className="h-2" />
            
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
