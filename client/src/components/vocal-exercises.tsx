import { useState, useEffect, useCallback, useRef } from "react";
import { Wind, Music2, Target, Play, Pause, RotateCcw, Volume2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PianoKeyboard } from "./piano-keyboard";
import { PitchDetector, type PitchResult, noteToString } from "@/lib/pitch-detection";

interface ExerciseProps {
  selectedDeviceId?: string;
}

const BREATH_PHASES = [
  { phase: "inhale", duration: 4, instruction: "Breathe IN through your nose" },
  { phase: "hold", duration: 4, instruction: "HOLD your breath" },
  { phase: "exhale", duration: 6, instruction: "Exhale slowly through your mouth" },
  { phase: "rest", duration: 2, instruction: "Rest" },
];

const PITCH_TARGETS = [
  { note: "C", octave: 3, name: "Low C" },
  { note: "E", octave: 3, name: "E3" },
  { note: "G", octave: 3, name: "G3" },
  { note: "C", octave: 4, name: "Middle C" },
  { note: "E", octave: 4, name: "E4" },
];

const WARMUP_EXERCISES = [
  {
    id: "lip-trill",
    name: "Lip Trills",
    duration: 30,
    description: "Relax your lips and blow air through them, like a motorboat sound",
    steps: [
      "Relax your face and jaw completely",
      "Gently close your lips without pressing",
      "Blow air steadily to make your lips vibrate",
      "Slide up and down in pitch while trilling",
    ],
    tip: "If your lips stop vibrating, you're pushing too hard. Less air, more relaxation."
  },
  {
    id: "humming",
    name: "Gentle Humming",
    duration: 30,
    description: "Hum on 'Mmm' to warm up your voice gently",
    steps: [
      "Close your lips gently",
      "Start humming at a comfortable middle pitch",
      "Feel the vibration in your lips and nose",
      "Slowly slide your pitch up and down",
    ],
    tip: "You should feel buzzing in your face. If you feel tension in your throat, go softer."
  },
  {
    id: "siren",
    name: "Siren Slides",
    duration: 45,
    description: "Slide smoothly from low to high like an ambulance siren",
    steps: [
      "Start on a comfortable low note with 'Wee'",
      "Slowly glide upward without breaking",
      "At the top, glide back down smoothly",
      "Keep it connected - no gaps or breaks",
    ],
    tip: "Go slowly! Speed is not the goal. Smooth, connected sound is what we want."
  },
];

export function VocalExercises({ selectedDeviceId }: ExerciseProps) {
  return (
    <Tabs defaultValue="breathing" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="breathing" data-testid="tab-breathing">
          <Wind className="h-4 w-4 mr-2" />
          Breath
        </TabsTrigger>
        <TabsTrigger value="warmup" data-testid="tab-warmup">
          <Music2 className="h-4 w-4 mr-2" />
          Warm-up
        </TabsTrigger>
        <TabsTrigger value="pitch" data-testid="tab-pitch">
          <Target className="h-4 w-4 mr-2" />
          Pitch
        </TabsTrigger>
      </TabsList>

      <TabsContent value="breathing">
        <BreathingExercise />
      </TabsContent>

      <TabsContent value="warmup">
        <WarmupExercises />
      </TabsContent>

      <TabsContent value="pitch">
        <PitchMatchingExercise selectedDeviceId={selectedDeviceId} />
      </TabsContent>
    </Tabs>
  );
}

function BreathingExercise() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentPhase = BREATH_PHASES[currentPhaseIndex];
  const totalCycles = 4;

  const startExercise = () => {
    setIsRunning(true);
    setCurrentPhaseIndex(0);
    setPhaseProgress(0);
    setCycleCount(0);
  };

  const stopExercise = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentPhaseIndex(0);
    setPhaseProgress(0);
  };

  useEffect(() => {
    if (!isRunning) return;

    const tickMs = 100;
    const phaseDurationMs = currentPhase.duration * 1000;

    intervalRef.current = setInterval(() => {
      setPhaseProgress(prev => {
        const next = prev + (tickMs / phaseDurationMs) * 100;
        if (next >= 100) {
          const nextPhaseIndex = (currentPhaseIndex + 1) % BREATH_PHASES.length;
          setCurrentPhaseIndex(nextPhaseIndex);
          
          if (nextPhaseIndex === 0) {
            setCycleCount(c => {
              if (c + 1 >= totalCycles) {
                setIsRunning(false);
                return 0;
              }
              return c + 1;
            });
          }
          return 0;
        }
        return next;
      });
    }, tickMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, currentPhaseIndex, currentPhase.duration]);

  const getPhaseColor = () => {
    switch (currentPhase.phase) {
      case "inhale": return "bg-blue-500";
      case "hold": return "bg-yellow-500";
      case "exhale": return "bg-green-500";
      default: return "bg-muted";
    }
  };

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wind className="h-5 w-5 text-primary" />
          Breath Control
        </CardTitle>
        <CardDescription>
          Strong breath support is the foundation of good singing. Practice this daily.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isRunning ? (
          <>
            <div className="space-y-3 text-sm">
              <p className="font-medium">How to do this exercise:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-blue-500 font-bold">Inhale:</span>
                  Breathe deeply into your belly, not your chest. Your stomach should expand.
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-500 font-bold">Hold:</span>
                  Keep the air in without tensing. Stay relaxed.
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500 font-bold">Exhale:</span>
                  Let air out slowly and controlled, like fogging a mirror.
                </li>
              </ul>
            </div>
            <Button className="w-full" onClick={startExercise} data-testid="button-start-breathing">
              <Play className="h-4 w-4 mr-2" />
              Start Breathing Exercise
            </Button>
          </>
        ) : (
          <>
            <div className="text-center space-y-4">
              <div className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center ${getPhaseColor()} transition-all duration-500`}>
                <span className="text-white text-xl font-bold capitalize">
                  {currentPhase.phase}
                </span>
              </div>
              <p className="text-lg font-medium">{currentPhase.instruction}</p>
              <Progress value={phaseProgress} className="h-3" />
              <p className="text-sm text-muted-foreground">
                Cycle {cycleCount + 1} of {totalCycles}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={stopExercise} data-testid="button-stop-breathing">
              <Pause className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function WarmupExercises() {
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startExercise = (exerciseId: string, duration: number) => {
    setActiveExercise(exerciseId);
    setProgress(0);

    const tickMs = 100;
    const durationMs = duration * 1000;

    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (tickMs / durationMs) * 100;
        if (next >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setActiveExercise(null);
          setCompletedExercises(completed => [...completed, exerciseId]);
          return 0;
        }
        return next;
      });
    }, tickMs);
  };

  const stopExercise = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveExercise(null);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const resetProgress = () => {
    setCompletedExercises([]);
  };

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Music2 className="h-5 w-5 text-primary" />
              Vocal Warm-ups
            </CardTitle>
            <CardDescription>
              Always warm up before singing. Cold vocals lead to strain and damage.
            </CardDescription>
          </div>
          {completedExercises.length > 0 && (
            <Button variant="ghost" size="icon" onClick={resetProgress}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {WARMUP_EXERCISES.map((exercise) => {
          const isActive = activeExercise === exercise.id;
          const isCompleted = completedExercises.includes(exercise.id);

          return (
            <div 
              key={exercise.id}
              className={`p-4 rounded-lg border ${isCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/30'}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <h4 className="font-medium flex items-center gap-2">
                    {exercise.name}
                    {isCompleted && <Check className="h-4 w-4 text-green-500" />}
                  </h4>
                  <p className="text-sm text-muted-foreground">{exercise.description}</p>
                </div>
                {!isActive && !isCompleted && (
                  <Button 
                    size="sm" 
                    onClick={() => startExercise(exercise.id, exercise.duration)}
                    data-testid={`button-start-${exercise.id}`}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    {exercise.duration}s
                  </Button>
                )}
              </div>

              {isActive && (
                <div className="space-y-3 mt-3">
                  <ol className="text-sm space-y-1">
                    {exercise.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-muted-foreground">
                        <span className="font-medium text-primary">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="text-xs text-primary bg-primary/10 p-2 rounded">
                    Tip: {exercise.tip}
                  </div>
                  <Progress value={progress} className="h-2" />
                  <Button variant="outline" size="sm" className="w-full" onClick={stopExercise}>
                    <Pause className="h-3 w-3 mr-1" />
                    Stop
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PitchMatchingExercise({ selectedDeviceId }: { selectedDeviceId?: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [detector, setDetector] = useState<PitchDetector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNotes, setSuccessNotes] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  
  const targetRef = useRef(currentTargetIndex);
  targetRef.current = currentTargetIndex;
  
  const matchCountRef = useRef(matchCount);
  matchCountRef.current = matchCount;

  const currentTarget = PITCH_TARGETS[currentTargetIndex];
  const targetFullNote = `${currentTarget.note}${currentTarget.octave}`;

  const handlePitch = useCallback((result: PitchResult | null) => {
    setCurrentPitch(result);
    
    const target = PITCH_TARGETS[targetRef.current];
    if (!target) return;
    
    if (result && result.note === target.note && result.octave === target.octave) {
      if (Math.abs(result.cents) < 25) {
        const newCount = matchCountRef.current + 1;
        setMatchCount(newCount);
        
        if (newCount >= 15) {
          setSuccessNotes(s => [...s, targetRef.current]);
          if (targetRef.current < PITCH_TARGETS.length - 1) {
            setCurrentTargetIndex(i => i + 1);
            setMatchCount(0);
          } else {
            setIsComplete(true);
          }
        }
      }
    } else {
      if (matchCountRef.current > 0) {
        setMatchCount(prev => Math.max(0, prev - 1));
      }
    }
  }, []);

  const startPractice = async () => {
    setError(null);
    setIsComplete(false);
    const pitchDetector = new PitchDetector();
    setDetector(pitchDetector);

    try {
      await pitchDetector.start(selectedDeviceId, handlePitch);
      setIsRunning(true);
      setCurrentTargetIndex(0);
      setMatchCount(0);
      setSuccessNotes([]);
    } catch (err) {
      console.error("Failed to start pitch detection:", err);
      setError("Could not access microphone. Please check permissions.");
    }
  };

  const stopPractice = () => {
    if (detector) {
      detector.stop();
      setDetector(null);
    }
    setIsRunning(false);
    setCurrentPitch(null);
  };

  useEffect(() => {
    return () => {
      if (detector) {
        detector.stop();
      }
    };
  }, [detector]);

  const playTargetTone = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    const frequencies: { [key: string]: number } = {
      'C3': 130.81, 'E3': 164.81, 'G3': 196.00, 'C4': 261.63, 'E4': 329.63
    };
    
    oscillator.frequency.value = frequencies[targetFullNote] || 261.63;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
    oscillator.stop(audioContext.currentTime + 1.5);
  };

  const matchProgress = (matchCount / 15) * 100;

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Pitch Matching
        </CardTitle>
        <CardDescription>
          Train your ear and voice to hit specific notes accurately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {!isRunning ? (
          <>
            <div className="space-y-3 text-sm">
              <p className="font-medium">How this works:</p>
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-medium text-primary">1.</span>
                  Listen to the target note by pressing the speaker button
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-primary">2.</span>
                  Sing that note on "Ahh" - watch the piano to see where you are
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-primary">3.</span>
                  Adjust until the key turns green - that means you're on pitch
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-primary">4.</span>
                  Hold the pitch to advance to the next note
                </li>
              </ol>
            </div>
            <Button className="w-full" onClick={startPractice} data-testid="button-start-pitch">
              <Play className="h-4 w-4 mr-2" />
              Start Pitch Practice
            </Button>
          </>
        ) : isComplete ? (
          <>
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="h-10 w-10 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">Excellent!</p>
                <p className="text-muted-foreground">You matched all {PITCH_TARGETS.length} notes!</p>
              </div>
              <div className="flex gap-2 justify-center">
                {PITCH_TARGETS.map((target, index) => (
                  <div
                    key={index}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-green-500 text-white"
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={stopPractice} data-testid="button-finish-pitch">
              <RotateCcw className="h-4 w-4 mr-2" />
              Practice Again
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Target Note:</p>
                <p className="text-3xl font-bold text-primary">{targetFullNote}</p>
              </div>
              <Button variant="outline" size="icon" onClick={playTargetTone} data-testid="button-play-tone">
                <Volume2 className="h-5 w-5" />
              </Button>
            </div>

            <PianoKeyboard
              currentNote={currentPitch?.note}
              currentOctave={currentPitch?.octave}
              cents={currentPitch?.cents}
              targetNote={targetFullNote}
            />

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Hold the pitch to lock it in</span>
                <span>{Math.round(matchProgress)}%</span>
              </div>
              <Progress value={matchProgress} className="h-2" />
            </div>

            <div className="flex gap-2 justify-center">
              {PITCH_TARGETS.map((target, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                    ${successNotes.includes(index) ? 'bg-green-500 text-white' : 
                      index === currentTargetIndex ? 'bg-primary text-primary-foreground' : 
                      'bg-muted text-muted-foreground'}`}
                >
                  {index + 1}
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full" onClick={stopPractice} data-testid="button-stop-pitch">
              <Pause className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
