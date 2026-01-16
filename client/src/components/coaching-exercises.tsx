import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell } from "lucide-react";
import type { CoachingFeedback } from "@shared/schema";

interface CoachingExercisesProps {
  feedback: CoachingFeedback | null;
}

export function CoachingExercises({ feedback }: CoachingExercisesProps) {
  if (!feedback || feedback.exercises.length === 0) {
    return (
      <Card className="overflow-visible">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Practice Exercises</h3>
              <p className="text-muted-foreground text-sm mt-1">
                After analyzing your voice, personalized exercises will appear here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Recommended Exercises</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback.exercises.map((exercise, i) => (
          <div 
            key={i} 
            className="p-4 rounded-lg bg-muted/50 space-y-2 hover-elevate"
            data-testid={`card-exercise-${i}`}
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h4 className="font-semibold text-sm">{exercise.name}</h4>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {exercise.duration}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {exercise.description}
            </p>
          </div>
        ))}

        <div className="pt-2 text-center">
          <p className="text-xs text-muted-foreground">
            Practice these exercises daily for best results
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
