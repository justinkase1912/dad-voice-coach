import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { VoiceRecorder } from "@/components/voice-recorder";
import { FeedbackDisplay } from "@/components/feedback-display";
import { CoachingExercises } from "@/components/coaching-exercises";
import { RecordingHistory } from "@/components/recording-history";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Recording, VoiceAnalysis, CoachingFeedback } from "@shared/schema";
import { Mic } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<VoiceAnalysis | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<CoachingFeedback | null>(null);

  const { data: recordings = [], isLoading: isLoadingRecordings } = useQuery<Recording[]>({
    queryKey: ["/api/recordings"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async ({ audioBlob, duration }: { audioBlob: Blob; duration: string }) => {
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(audioBlob);
      });

      const response = await apiRequest("POST", "/api/analyze", {
        audio: base64Audio,
        duration,
      });
      return response as Recording;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      setSelectedRecording(data);
      setCurrentAnalysis(data.analysis);
      setCurrentFeedback(data.feedback);
      toast({
        title: "Analysis Complete",
        description: "Your voice coach has prepared feedback for you.",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze recording",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/recordings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      if (selectedRecording && recordings.find(r => r.id === selectedRecording.id)) {
        setSelectedRecording(null);
        setCurrentAnalysis(null);
        setCurrentFeedback(null);
      }
      toast({
        title: "Recording Deleted",
        description: "The recording has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete recording",
        variant: "destructive",
      });
    },
  });

  const handleRecordingComplete = (audioBlob: Blob, duration: string) => {
    analyzeMutation.mutate({ audioBlob, duration });
  };

  const handleSelectRecording = (recording: Recording) => {
    setSelectedRecording(recording);
    setCurrentAnalysis(recording.analysis);
    setCurrentFeedback(recording.feedback);
  };

  const handleDeleteRecording = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <Mic className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">DadVoice Coach</h1>
              <p className="text-xs text-muted-foreground">Your AI singing companion</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <VoiceRecorder 
              onRecordingComplete={handleRecordingComplete}
              isProcessing={analyzeMutation.isPending}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeedbackDisplay 
                analysis={currentAnalysis} 
                feedback={currentFeedback} 
              />
              <CoachingExercises feedback={currentFeedback} />
            </div>
          </div>

          <div className="lg:col-span-1">
            <RecordingHistory
              recordings={recordings}
              onSelect={handleSelectRecording}
              onDelete={handleDeleteRecording}
              selectedId={selectedRecording?.id ?? null}
              isLoading={isLoadingRecordings}
            />
          </div>
        </div>
      </main>

      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>DadVoice Coach - Find your clean singing voice with AI-powered coaching</p>
          <p className="mt-1 text-xs">Perfect for punk/metal vocalists exploring blues and alt-folk styles</p>
        </div>
      </footer>
    </div>
  );
}
