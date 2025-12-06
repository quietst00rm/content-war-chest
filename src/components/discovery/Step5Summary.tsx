import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { UserStrategy, IdeaSource, TargetMarket, PrimaryOutcome, ValidationEnjoyment, ValidationLearning, ValidationLongevity, ValidationStatus } from "@/hooks/use-user-strategy";
import { Briefcase, BookOpen, Users, Lightbulb, Heart, DollarSign, Check, X, AlertTriangle, TrendingUp } from "lucide-react";

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

function getMarketColor(market: TargetMarket | null): string {
  const colors: Record<TargetMarket, string> = {
    health: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    wealth: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    relationships: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return market ? colors[market] : "";
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

function getOutcomeDescription(outcome: PrimaryOutcome | null): string {
  const descriptions: Record<PrimaryOutcome, string> = {
    make_money: "Help them earn more income or revenue",
    save_money: "Help them reduce costs or expenses",
    save_time: "Help them be more efficient and productive",
    health_fitness: "Help them get healthier and fitter",
    attractiveness: "Help them look and feel more attractive",
    peace_of_mind: "Help them feel calmer and more secure",
  };
  return outcome ? descriptions[outcome] : "";
}

function getStatusColor(status: ValidationStatus | null): string {
  const colors: Record<ValidationStatus, string> = {
    strong: "text-green-600 dark:text-green-400",
    moderate: "text-amber-600 dark:text-amber-400",
    weak: "text-red-600 dark:text-red-400",
  };
  return status ? colors[status] : "";
}

function getStatusBgColor(status: ValidationStatus | null): string {
  const colors: Record<ValidationStatus, string> = {
    strong: "bg-green-100 dark:bg-green-900/30",
    moderate: "bg-amber-100 dark:bg-amber-900/30",
    weak: "bg-red-100 dark:bg-red-900/30",
  };
  return status ? colors[status] : "";
}

function getStatusLabel(status: ValidationStatus | null): string {
  const labels: Record<ValidationStatus, string> = {
    strong: "Strong Validation",
    moderate: "Moderate Validation",
    weak: "Weak Validation",
  };
  return status ? labels[status] : "";
}

function getRecommendation(status: ValidationStatus | null): string {
  const recommendations: Record<ValidationStatus, string> = {
    strong: "Your idea shows strong potential. Proceed to Stage 2 with confidence!",
    moderate: "Consider refining your positioning before proceeding to get better results.",
    weak: "You may want to reconsider your idea choice or revisit your answers.",
  };
  return status ? recommendations[status] : "";
}

interface Step5SummaryProps {
  strategy: UserStrategy | null;
  calculateValidationScore: (
    enjoyment: ValidationEnjoyment | null,
    learning: ValidationLearning | null,
    longevity: ValidationLongevity | null
  ) => { score: number; status: ValidationStatus };
}

export function Step5Summary({ strategy, calculateValidationScore }: Step5SummaryProps) {
  // Calculate validation score
  const { score, status } = useMemo(() => {
    return calculateValidationScore(
      strategy?.validation_enjoyment || null,
      strategy?.validation_learning || null,
      strategy?.validation_longevity || null
    );
  }, [strategy, calculateValidationScore]);

  // Generate value statement
  const valueStatement = useMemo(() => {
    if (!strategy?.who_you_help || !strategy?.what_you_help_them_do) {
      return "Complete the previous steps to generate your value statement.";
    }
    return `I help ${strategy.who_you_help} ${strategy.what_you_help_them_do}.`;
  }, [strategy]);

  // Get icon for source
  const SourceIcon = getSourceIcon(strategy?.idea_source);

  // Get validation breakdown
  const validationBreakdown = [
    {
      question: "Do you enjoy doing this?",
      answer: strategy?.validation_enjoyment,
      score: strategy?.validation_enjoyment === "yes" ? 3 : strategy?.validation_enjoyment === "somewhat" ? 1 : 0,
      maxScore: 3,
      isPositive: strategy?.validation_enjoyment === "yes",
      isNeutral: strategy?.validation_enjoyment === "somewhat",
    },
    {
      question: "Excited to keep learning?",
      answer: strategy?.validation_learning,
      score: strategy?.validation_learning === "yes" ? 3 : strategy?.validation_learning === "somewhat" ? 1 : 0,
      maxScore: 3,
      isPositive: strategy?.validation_learning === "yes",
      isNeutral: strategy?.validation_learning === "somewhat",
    },
    {
      question: "Will you still enjoy this in 6-12 months?",
      answer: strategy?.validation_longevity,
      score: strategy?.validation_longevity === "yes" ? 3 : strategy?.validation_longevity === "probably" ? 2 : strategy?.validation_longevity === "unsure" ? 1 : 0,
      maxScore: 3,
      isPositive: strategy?.validation_longevity === "yes" || strategy?.validation_longevity === "probably",
      isNeutral: strategy?.validation_longevity === "unsure",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Summary & Results
        </h2>
        <p className="text-muted-foreground mt-2">
          Review your strategy and validation score
        </p>
      </div>

      {/* Section A: Expertise Source */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            {SourceIcon && <SourceIcon className="h-4 w-4" />}
            Expertise Source
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {getSourceLabel(strategy?.idea_source)}
            </Badge>
            {strategy?.years_experience && (
              <span className="text-sm text-muted-foreground">
                {strategy.years_experience} years experience
              </span>
            )}
          </div>
          {strategy?.idea_source_details && (
            <p className="text-sm text-muted-foreground">
              {strategy.idea_source_details}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section B: Market Alignment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Market Alignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getMarketColor(strategy?.target_market)}>
              {getMarketLabel(strategy?.target_market)}
            </Badge>
            <span className="text-muted-foreground">market with</span>
            <Badge variant="outline">
              {getOutcomeLabel(strategy?.primary_outcome)}
            </Badge>
            <span className="text-muted-foreground">outcome</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {getOutcomeDescription(strategy?.primary_outcome)}
          </p>
        </CardContent>
      </Card>

      {/* Section C: Target Customer & Value Statement */}
      <Card className="border-primary/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Your Value Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold text-primary">
            {valueStatement}
          </p>
        </CardContent>
      </Card>

      {/* Section D: Validation Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Validation Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Display */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "text-4xl font-bold",
              getStatusColor(status)
            )}>
              {score}/9
            </div>
            <div className="flex-1">
              <Progress
                value={(score / 9) * 100}
                className={cn(
                  "h-3",
                  status === "strong" && "[&>div]:bg-green-500",
                  status === "moderate" && "[&>div]:bg-amber-500",
                  status === "weak" && "[&>div]:bg-red-500"
                )}
              />
            </div>
          </div>

          {/* Status Badge */}
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
            getStatusBgColor(status)
          )}>
            {status === "strong" && <Check className="h-4 w-4 text-green-600 dark:text-green-400" />}
            {status === "moderate" && <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            {status === "weak" && <X className="h-4 w-4 text-red-600 dark:text-red-400" />}
            <span className={cn("font-medium", getStatusColor(status))}>
              {getStatusLabel(status)}
            </span>
          </div>

          {/* Recommendation */}
          <p className="text-sm">{getRecommendation(status)}</p>

          {/* Breakdown */}
          <div className="border-t pt-4 space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Score Breakdown</h4>
            {validationBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {item.isPositive ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : item.isNeutral ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                  {item.question}
                </span>
                <span className="text-muted-foreground">
                  +{item.score} pts
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section E: Expansion Potential */}
      {strategy?.expansion_potential && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Expansion Potential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {strategy.expansion_potential}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
