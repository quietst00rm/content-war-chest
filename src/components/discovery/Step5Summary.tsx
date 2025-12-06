import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { UserStrategy, IdeaSource, TargetMarket, PrimaryOutcome, ValidationEnjoyment, ValidationLearning, ValidationLongevity, ValidationStatus } from "@/hooks/use-user-strategy";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, BookOpen, Users, Lightbulb, Heart, DollarSign, Check, X, AlertTriangle, TrendingUp, Wand2, Loader2, Copy, Sparkles, FileText, Lightbulb as IdeaIcon } from "lucide-react";
import { toast } from "sonner";

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

interface ValueStatements {
  headline: string;
  bio: string;
  elevator_pitch: string;
  linkedin_headline: string;
  positioning_statement: string;
}

interface ContentIdeas {
  pillar_topics: string[];
  content_ideas: Array<{
    title: string;
    type: string;
    angle: string;
  }>;
  lead_magnet_ideas: string[];
  content_series: {
    name: string;
    description: string;
  };
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
  const [isGeneratingStatements, setIsGeneratingStatements] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [valueStatements, setValueStatements] = useState<ValueStatements | null>(null);
  const [contentIdeas, setContentIdeas] = useState<ContentIdeas | null>(null);

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

  // Generate AI value statements
  const handleGenerateStatements = async () => {
    if (!strategy?.idea_source_details || !strategy?.target_market || !strategy?.primary_outcome || !strategy?.who_you_help || !strategy?.what_you_help_them_do) {
      toast.error("Please complete all steps first");
      return;
    }

    setIsGeneratingStatements(true);
    try {
      const { data, error } = await supabase.functions.invoke("discovery-ai", {
        body: {
          action: "generate_value_statements",
          expertise: strategy.idea_source_details,
          expertise_source: getSourceLabel(strategy.idea_source),
          market: strategy.target_market,
          outcome: strategy.primary_outcome,
          who_you_help: strategy.who_you_help,
          what_you_help_them_do: strategy.what_you_help_them_do,
        },
      });

      if (error) throw error;

      setValueStatements(data);
      toast.success("Value statements generated!");
    } catch (error) {
      console.error("Error generating statements:", error);
      toast.error("Failed to generate statements. Please try again.");
    } finally {
      setIsGeneratingStatements(false);
    }
  };

  // Generate AI content ideas
  const handleGenerateContent = async () => {
    if (!strategy?.idea_source_details || !strategy?.target_market || !strategy?.primary_outcome || !strategy?.who_you_help || !strategy?.what_you_help_them_do) {
      toast.error("Please complete all steps first");
      return;
    }

    setIsGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke("discovery-ai", {
        body: {
          action: "generate_content_ideas",
          expertise: strategy.idea_source_details,
          market: strategy.target_market,
          outcome: strategy.primary_outcome,
          who_you_help: strategy.who_you_help,
          what_you_help_them_do: strategy.what_you_help_them_do,
          expansion_potential: strategy.expansion_potential,
        },
      });

      if (error) throw error;

      setContentIdeas(data);
      toast.success("Content ideas generated!");
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Failed to generate content ideas. Please try again.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const canGenerate = strategy?.idea_source_details && strategy?.target_market && strategy?.primary_outcome && strategy?.who_you_help && strategy?.what_you_help_them_do;

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
        <CardContent className="space-y-4">
          <p className="text-xl font-semibold text-primary">
            {valueStatement}
          </p>

          {/* AI Value Statement Generator */}
          <div className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateStatements}
              disabled={!canGenerate || isGeneratingStatements}
              className="w-full sm:w-auto gap-2"
            >
              {isGeneratingStatements ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating variations...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate AI Variations
                </>
              )}
            </Button>
          </div>

          {/* AI Generated Statements */}
          {valueStatements && (
            <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
              <Tabs defaultValue="headline" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="headline" className="text-xs">Headline</TabsTrigger>
                  <TabsTrigger value="bio" className="text-xs">Bio</TabsTrigger>
                  <TabsTrigger value="pitch" className="text-xs">Pitch</TabsTrigger>
                  <TabsTrigger value="linkedin" className="text-xs">LinkedIn</TabsTrigger>
                </TabsList>
                <TabsContent value="headline" className="mt-3">
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <p className="text-lg font-semibold">{valueStatements.headline}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(valueStatements.headline, "Headline")}
                      className="mt-2 h-8 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="bio" className="mt-3">
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <p className="text-sm">{valueStatements.bio}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(valueStatements.bio, "Bio")}
                      className="mt-2 h-8 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="pitch" className="mt-3">
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <p className="text-sm">{valueStatements.elevator_pitch}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(valueStatements.elevator_pitch, "Elevator pitch")}
                      className="mt-2 h-8 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="linkedin" className="mt-3">
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <p className="text-sm">{valueStatements.linkedin_headline}</p>
                    <p className="text-xs text-muted-foreground mt-1">{valueStatements.linkedin_headline.length}/120 characters</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(valueStatements.linkedin_headline, "LinkedIn headline")}
                      className="mt-2 h-8 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {valueStatements.positioning_statement && (
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Positioning Statement
                  </h4>
                  <p className="text-sm italic">{valueStatements.positioning_statement}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(valueStatements.positioning_statement, "Positioning statement")}
                    className="mt-2 h-8 text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              )}
            </div>
          )}
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

      {/* Section F: AI Content Ideas */}
      <Card className="border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <IdeaIcon className="h-4 w-4" />
            Content Ideas
          </CardTitle>
          <CardDescription>
            Get AI-generated content ideas tailored to your expertise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!contentIdeas ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateContent}
              disabled={!canGenerate || isGeneratingContent}
              className="w-full sm:w-auto gap-2"
            >
              {isGeneratingContent ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating content ideas...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Content Ideas
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Pillar Topics */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Your Content Pillars
                </h4>
                <div className="flex flex-wrap gap-2">
                  {contentIdeas.pillar_topics.map((topic, index) => (
                    <Badge key={index} variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Content Ideas */}
              <div>
                <h4 className="text-sm font-medium mb-3">Post Ideas</h4>
                <div className="grid gap-2">
                  {contentIdeas.content_ideas.slice(0, 5).map((idea, index) => (
                    <div key={index} className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{idea.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{idea.angle}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {idea.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {contentIdeas.content_ideas.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    +{contentIdeas.content_ideas.length - 5} more ideas
                  </p>
                )}
              </div>

              {/* Lead Magnets */}
              <div>
                <h4 className="text-sm font-medium mb-2">Lead Magnet Ideas</h4>
                <ul className="space-y-1">
                  {contentIdeas.lead_magnet_ideas.map((idea, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {idea}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Content Series */}
              {contentIdeas.content_series && (
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
                    Content Series: {contentIdeas.content_series.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {contentIdeas.content_series.description}
                  </p>
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerateContent}
                disabled={isGeneratingContent}
                className="gap-2"
              >
                <Wand2 className="h-3 w-3" />
                Regenerate Ideas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
