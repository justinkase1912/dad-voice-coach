import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, TrendingUp, Trash2, Music } from "lucide-react";
import type { Recording } from "@shared/schema";
import { format } from "date-fns";

interface RecordingHistoryProps {
  recordings: Recording[];
  onSelect: (recording: Recording) => void;
  onDelete: (id: number) => void;
  selectedId: number | null;
  isLoading: boolean;
}

export function RecordingHistory({ 
  recordings, 
  onSelect, 
  onDelete, 
  selectedId,
  isLoading 
}: RecordingHistoryProps) {
  if (isLoading) {
    return (
      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Music className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your coaching sessions will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Session History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-2">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover-elevate ${
                  selectedId === recording.id 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent bg-muted/50"
                }`}
                onClick={() => onSelect(recording)}
                data-testid={`card-recording-${recording.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{recording.title}</h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(recording.createdAt), "MMM d, h:mm a")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {recording.duration}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {recording.analysis && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs flex items-center gap-1"
                      >
                        <TrendingUp className="h-3 w-3" />
                        {recording.analysis.overallScore}
                      </Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(recording.id);
                      }}
                      data-testid={`button-delete-recording-${recording.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
