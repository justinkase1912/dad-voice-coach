import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: string) => void;
  isProcessing: boolean;
  onDeviceChange?: (deviceId: string) => void;
}

export function VoiceRecorder({ onRecordingComplete, isProcessing, onDeviceChange }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(32).fill(0));
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadAudioDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
        }));
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        const defaultDevice = audioInputs[0].deviceId;
        setSelectedDeviceId(defaultDevice);
        onDeviceChange?.(defaultDevice);
      }
    } catch (err) {
      console.error("Error loading audio devices:", err);
    }
  }, [selectedDeviceId, onDeviceChange]);

  useEffect(() => {
    loadAudioDevices();
    navigator.mediaDevices.addEventListener("devicechange", loadAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", loadAudioDevices);
    };
  }, [loadAudioDevices]);

  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const step = Math.floor(dataArray.length / 32);
    const levels = [];
    for (let i = 0; i < 32; i++) {
      const sum = dataArray.slice(i * step, (i + 1) * step).reduce((a, b) => a + b, 0);
      levels.push((sum / step / 255) * 100);
    }
    
    setAudioLevels(levels);
    animationRef.current = requestAnimationFrame(updateAudioLevels);
  }, []);

  const startRecording = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        onRecordingComplete(blob, durationStr);
        setDuration(0);
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      
      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
      
      updateAudioLevels();
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setIsRecording(false);
    setAudioLevels(new Array(32).fill(0));
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="overflow-visible">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-1">
              {isRecording ? "Recording..." : isProcessing ? "Analyzing..." : "Ready to Record"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isRecording 
                ? "Sing naturally - the coach is listening" 
                : isProcessing 
                  ? "Your voice coach is preparing feedback"
                  : "Tap the microphone to start your session"}
            </p>
          </div>

          <div className="h-20 w-full flex items-center justify-center gap-1 px-4">
            {audioLevels.map((level, i) => (
              <div
                key={i}
                className="w-2 bg-primary rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(8, level * 0.8)}%`,
                  opacity: isRecording ? 0.5 + (level / 200) : 0.2,
                }}
              />
            ))}
          </div>

          <div className="relative">
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
            )}
            <Button
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`h-20 w-20 rounded-full ${
                isRecording 
                  ? "bg-destructive hover:bg-destructive/90" 
                  : "bg-primary hover:bg-primary/90"
              }`}
              data-testid={isRecording ? "button-stop-recording" : "button-start-recording"}
            >
              {isProcessing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : isRecording ? (
                <Square className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
          </div>

          {isRecording && (
            <div className="text-2xl font-mono font-semibold text-primary" data-testid="text-recording-duration">
              {formatTime(duration)}
            </div>
          )}

          {audioDevices.length > 1 && (
            <div className="w-full max-w-xs">
              <Select
                value={selectedDeviceId}
                onValueChange={(value) => {
                  setSelectedDeviceId(value);
                  onDeviceChange?.(value);
                }}
                disabled={isRecording || isProcessing}
              >
                <SelectTrigger 
                  className="w-full text-sm"
                  data-testid="select-audio-device"
                >
                  <Mic className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.map((device) => (
                    <SelectItem 
                      key={device.deviceId} 
                      value={device.deviceId}
                      data-testid={`option-device-${device.deviceId}`}
                    >
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {audioDevices.length === 1 && (
            <div className="text-center text-xs text-muted-foreground">
              <span>Using: {audioDevices[0]?.label || "Default Microphone"}</span>
            </div>
          )}

          {audioDevices.length === 0 && !isRecording && !isProcessing && (
            <div className="text-center text-xs text-destructive">
              No microphone detected. Please connect a microphone.
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground">
            <p>For best results, record 15-60 seconds of singing</p>
            <p>Try phrases you want to improve</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
