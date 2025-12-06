import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { UserStrategy, IdeaSource, TargetMarket, PrimaryOutcome } from "@/hooks/use-user-strategy";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Briefcase, BookOpen, Users, Lightbulb, Heart, DollarSign, Sparkles, Wand2, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

// Generic words that trigger a warning
const GENERIC_WORDS = ["people", "everyone", "anyone", "businesses", "companies"];

// Helper functions for display
function getSourceLabel(source: IdeaSource | null): string {
  const labels: Record<IdeaSource, string> = {
    practical_experience: "Practical Experience",
    learned_obsession: "Learned Obsession",
    advice_sought: "Advice Sought",
    problem_solved: "Problem Solved",
  };
  return source ? labels[source] : "";
}

function getSourceIcon(source: IdeaSource | null) {
  const icons: Record<IdeaSource, typeof Briefcase> = {
    practical_experience: Briefcase,
    learned_obsession: BookOpen,
    advice_sought: Users,
    problem_solved: Lightbulb,
  };
  return source ? icons[source] : null;
}

function getMarketLabel(market: TargetMarket | null): string {
  const labels: Record<TargetMarket, string> = {
    health: "Health",
    wealth: "Wealth",
    relationships: "Relationships",
  };
  return market ? labels[market] : "";
}

function getMarketIcon(market: TargetMarket | null) {
  const icons: Record<TargetMarket, typeof Heart> = {
    health: Heart,
    wealth: DollarSign,
    relationships: Users,
  };
  return market ? icons[market] : null;
}

function getOutcomeLabel(outcome: PrimaryOutcome | null): string {
  const labels: Record<PrimaryOutcome, string> = {
    make_money: "Make Money",
    save_money: "Save Money",
    save_time: "Save Time",
    health_fitness: "Health & Fitness",
    attractiveness: "Attractiveness",
    peace_of_mind: "Peace of Mind",
  };
  return outcome ? labels[outcome] : "";
}

interface AISuggestions {
  refined_who: string[];
  refined_what: string[];
  tip: string;
}

interface Step3TargetAudienceProps {
  strategy: UserStrategy | null;
  onUpdate: (updates: Partial<UserStrategy>) => Promise<void>;
  onValidChange: (isValid: boolean) => void;
}

export function Step3TargetAudience({
  strategy,
  onUpdate,
  onValidChange,
}: Step3TargetAudienceProps) {
  const [whoYouHelp, setWhoYouHelp] = useState(strategy?.who_you_help || "");
  const [whatYouHelp, setWhatYouHelp] = useState(strategy?.what_you_help_them_do || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);

  // Check for generic words in WHO field
  const hasGenericWord = useMemo(() => {
    const lowerWho = whoYouHelp.toLowerCase();
    return GENERIC_WORDS.some((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      return regex.test(lowerWho);
    });
  }, [whoYouHelp]);

  // Validate on state changes
  useEffect(() => {
    const isValid =
      whoYouHelp.length >= 10 &&
      whoYouHelp.length <= 100 &&
      whatYouHelp.length >= 10 &&
      whatYouHelp.length <= 150;
    onValidChange(isValid);
  }, [whoYouHelp, whatYouHelp, onValidChange]);

  // Sync from strategy when it changes
  useEffect(() => {
    if (strategy) {
      setWhoYouHelp(strategy.who_you_help || "");
      setWhatYouHelp(strategy.what_you_help_them_do || "");
    }
  }, [strategy?.id]);

  const handleWhoChange = (value: string) => {
    const limited = value.slice(0, 100);
    setWhoYouHelp(limited);
  };

  const handleWhoSave = async () => {
    if (whoYouHelp !== strategy?.who_you_help) {
      await onUpdate({ who_you_help: whoYouHelp || null });
    }
  };

  const handleWhatChange = (value: string) => {
    const limited = value.slice(0, 150);
    setWhatYouHelp(limited);
  };

  const handleWhatSave = async () => {
    if (whatYouHelp !== strategy?.what_you_help_them_do) {
      await onUpdate({ what_you_help_them_do: whatYouHelp || null });
    }
  };

  // Generate AI suggestions
  const handleGenerateSuggestions = async () => {
    if (!strategy?.idea_source_details || !strategy?.target_market || !strategy?.primary_outcome) {
      toast.error("Please complete the previous steps first");
      return;
    }

    if (whoYouHelp.length < 5 || whatYouHelp.length < 5) {
      toast.error("Please enter at least a rough description first");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("discovery-ai", {
        body: {
          action: "refine_audience",
          expertise: strategy.idea_source_details,
          market: strategy.target_market,
          outcome: strategy.primary_outcome,
          who_you_help: whoYouHelp,
          what_you_help_them_do: whatYouHelp,
        },
      });

      if (error) throw error;

      setAiSuggestions(data);
      toast.success("AI suggestions generated!");
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast.error("Failed to generate suggestions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply a suggestion
  const applySuggestion = async (type: "who" | "what", value: string) => {
    if (type === "who") {
      const limited = value.slice(0, 100);
      setWhoYouHelp(limited);
      await onUpdate({ who_you_help: limited });
    } else {
      const limited = value.slice(0, 150);
      setWhatYouHelp(limited);
      await onUpdate({ what_you_help_them_do: limited });
    }
    toast.success("Suggestion applied!");
  };

  // Generate live preview
  const livePreview = useMemo(() => {
    const who = whoYouHelp.trim() || "[who you help]";
    const what = whatYouHelp.trim() || "[what you help them do]";
    return `I help ${who} ${what}.`;
  }, [whoYouHelp, whatYouHelp]);

  // Get icons for context card
  const SourceIcon = getSourceIcon(strategy?.idea_source);
  const MarketIcon = getMarketIcon(strategy?.target_market);

  // Check if we can generate suggestions
  const canGenerate = whoYouHelp.length >= 5 && whatYouHelp.length >= 5 && strategy?.idea_source_details;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Who specifically do you help?
        </h2>
        <p className="text-muted-foreground mt-2">
          Define your target customer with precision
        </p>
      </div>

      {/* Context Card - Summary of previous answers */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Your expertise summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              {SourceIcon && (
                <SourceIcon className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">
                {getSourceLabel(strategy?.idea_source)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {MarketIcon && (
                <MarketIcon className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">
                {getMarketLabel(strategy?.target_market)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {getOutcomeLabel(strategy?.primary_outcome)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input Fields */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Who do you help */}
          <div className="space-y-2">
            <Label htmlFor="who-you-help" className="text-base font-medium">
              Who do you help?
            </Label>
            <Input
              id="who-you-help"
              value={whoYouHelp}
              onChange={(e) => handleWhoChange(e.target.value)}
              onBlur={handleWhoSave}
              placeholder="Be specific. Not 'people' or 'businesses' — who exactly?"
              className={cn(
                hasGenericWord && "border-yellow-500 focus-visible:ring-yellow-500"
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Example: "Busy solo entrepreneurs working 60+ hours a week"
              </span>
              <span
                className={cn(
                  whoYouHelp.length > 100 && "text-destructive",
                  whoYouHelp.length >= 10 &&
                    whoYouHelp.length <= 100 &&
                    "text-green-600 dark:text-green-400"
                )}
              >
                {whoYouHelp.length}/100
              </span>
            </div>

            {/* Generic word warning */}
            {hasGenericWord && (
              <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-sm">
                  Your description may be too generic. Try to be more specific
                  about exactly who you serve.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* What do you help them do */}
          <div className="space-y-2">
            <Label htmlFor="what-you-help" className="text-base font-medium">
              What do you help them do or achieve?
            </Label>
            <Input
              id="what-you-help"
              value={whatYouHelp}
              onChange={(e) => handleWhatChange(e.target.value)}
              onBlur={handleWhatSave}
              placeholder="What transformation or action do you enable?"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Example: "Build a sustainable fitness routine in just 20 minutes
                a day"
              </span>
              <span
                className={cn(
                  whatYouHelp.length > 150 && "text-destructive",
                  whatYouHelp.length >= 10 &&
                    whatYouHelp.length <= 150 &&
                    "text-green-600 dark:text-green-400"
                )}
              >
                {whatYouHelp.length}/150
              </span>
            </div>
          </div>

          {/* AI Refine Button */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateSuggestions}
              disabled={!canGenerate || isGenerating}
              className="w-full sm:w-auto gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating suggestions...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Refine with AI
                </>
              )}
            </Button>
            {!canGenerate && (
              <p className="text-xs text-muted-foreground mt-2">
                Enter a rough description first, then AI can help refine it
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {aiSuggestions && (
        <Card className="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              AI Suggestions
            </CardTitle>
            <CardDescription>
              Click any suggestion to apply it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Who suggestions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Who you help
              </Label>
              <div className="space-y-2">
                {aiSuggestions.refined_who.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => applySuggestion("who", suggestion)}
                    className="w-full text-left p-3 rounded-lg border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{suggestion}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* What suggestions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-purple-700 dark:text-purple-300">
                What you help them do
              </Label>
              <div className="space-y-2">
                {aiSuggestions.refined_what.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => applySuggestion("what", suggestion)}
                    className="w-full text-left p-3 rounded-lg border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{suggestion}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tip */}
            {aiSuggestions.tip && (
              <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  <span className="font-medium">Tip:</span> {aiSuggestions.tip}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Preview */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">{livePreview}</p>
        </CardContent>
      </Card>
    </div>
  );
}
