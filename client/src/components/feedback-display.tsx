import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Music2, Wind, Activity, AlertTriangle, Star } from "lucide-react";
import type { VoiceAnalysis, CoachingFeedback } from "@shared/schema";

interface FeedbackDisplayProps {
  analysis: VoiceAnalysis | null;
  feedback: CoachingFeedback | null;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-orange-500";
};

const getProgressColor = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-orange-500";
};

const getStrainColor = (risk: number) => {
  if (risk <= 30) return "text-green-500";
  if (risk <= 60) return "text-yellow-500";
  return "text-red-500";
};

export function FeedbackDisplay({ analysis, feedback }: FeedbackDisplayProps) {
  if (!analysis || !feedback) {
    return (
      <Card className="overflow-visible">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Music2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No Analysis Yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Record a sample to get personalized coaching feedback
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg">Voice Analysis</CardTitle>
            <Badge variant="secondary" className="text-sm">
              Overall: {analysis.overallScore}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Music2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Pitch Accuracy</span>
                  <span className={`text-sm font-semibold ${getScoreColor(analysis.pitchAccuracy)}`}>
                    {analysis.pitchAccuracy}%
                  </span>
                </div>
                <Progress value={analysis.pitchAccuracy} className="h-2" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Tone Stability</span>
                  <span className={`text-sm font-semibold ${getScoreColor(analysis.toneStability)}`}>
                    {analysis.toneStability}%
                  </span>
                </div>
                <Progress value={analysis.toneStability} className="h-2" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Wind className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Breath Support</span>
                  <span className={`text-sm font-semibold ${getScoreColor(analysis.breathSupport)}`}>
                    {analysis.breathSupport}%
                  </span>
                </div>
                <Progress value={analysis.breathSupport} className="h-2" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Strain Risk</span>
                  <span className={`text-sm font-semibold ${getStrainColor(analysis.strainRisk)}`}>
                    {analysis.strainRisk <= 30 ? "Low" : analysis.strainRisk <= 60 ? "Medium" : "High"}
                  </span>
                </div>
                <Progress 
                  value={analysis.strainRisk} 
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Coaching Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed" data-testid="text-feedback-summary">
            {feedback.summary}
          </p>

          {feedback.strengths.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                <Star className="h-4 w-4" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {feedback.strengths.map((strength, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-500 mt-1">+</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.improvements.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
                Areas to Work On
              </h4>
              <ul className="space-y-1">
                {feedback.improvements.map((improvement, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-500 mt-1">-</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <p className="text-sm italic text-center" data-testid="text-encouragement">
              "{feedback.encouragement}"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
