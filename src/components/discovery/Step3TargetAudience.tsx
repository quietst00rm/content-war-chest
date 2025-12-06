import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { UserStrategy, IdeaSource, TargetMarket, PrimaryOutcome } from "@/hooks/use-user-strategy";
import { AlertTriangle, Briefcase, BookOpen, Users, Lightbulb, Heart, DollarSign, Sparkles } from "lucide-react";

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
    // Limit to 100 characters
    const limited = value.slice(0, 100);
    setWhoYouHelp(limited);
  };

  const handleWhoSave = async () => {
    if (whoYouHelp !== strategy?.who_you_help) {
      await onUpdate({ who_you_help: whoYouHelp || null });
    }
  };

  const handleWhatChange = (value: string) => {
    // Limit to 150 characters
    const limited = value.slice(0, 150);
    setWhatYouHelp(limited);
  };

  const handleWhatSave = async () => {
    if (whatYouHelp !== strategy?.what_you_help_them_do) {
      await onUpdate({ what_you_help_them_do: whatYouHelp || null });
    }
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
        </CardContent>
      </Card>

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
