"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { FEATURE_FLAGS, trackEvent, useFeatureFlag } from "@/lib/analytics";

export function BetaFeaturesCard() {
  const showBetaFeatures = useFeatureFlag(FEATURE_FLAGS.BETA_FEATURES);
  const showAIAssistant = useFeatureFlag(FEATURE_FLAGS.AI_ASSISTANT);

  if (!showBetaFeatures) {
    return null;
  }

  const handleAIAssistantClick = () => {
    trackEvent("feature_used", {
      feature_name: "ai_assistant",
      context: "dashboard",
    });
  };

  return (
    <Card className="border-dashed border-primary/50 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🧪</span>
          Beta Features
        </CardTitle>
        <CardDescription>
          You have access to experimental features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAIAssistant && (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleAIAssistantClick}
          >
            <span className="mr-2">🤖</span>
            AI Assistant
            <span className="ml-auto text-xs text-muted-foreground">New</span>
          </Button>
        )}
        <Button variant="outline" className="w-full justify-start">
          <span className="mr-2">📊</span>
          Advanced Analytics
          <span className="ml-auto text-xs text-muted-foreground">Beta</span>
        </Button>
        <p className="text-xs text-muted-foreground">
          These features are in beta and may change. Your feedback helps us
          improve!
        </p>
      </CardContent>
    </Card>
  );
}
