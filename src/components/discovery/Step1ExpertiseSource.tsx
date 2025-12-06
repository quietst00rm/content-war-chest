import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { IdeaSource, UserStrategy } from "@/hooks/use-user-strategy";
import { Briefcase, BookOpen, Users, Lightbulb } from "lucide-react";

interface ExpertiseSourceOption {
  id: IdeaSource;
  title: string;
  description: string;
  question: string;
  icon: typeof Briefcase;
}

const EXPERTISE_SOURCES: ExpertiseSourceOption[] = [
  {
    id: "practical_experience",
    title: "Practical Experience",
    description: "Skills you learned at work through your profession",
    question: "What skill have you learned really well at work?",
    icon: Briefcase,
  },
  {
    id: "learned_obsession",
    title: "Learned Obsession",
    description: "Topics you obsessively study in your spare time",
    question: "What topic are you so obsessed with you can't stop learning about it?",
    icon: BookOpen,
  },
  {
    id: "advice_sought",
    title: "Advice Sought",
    description: "Questions friends, family, or peers bring to you",
    question: "What do people regularly come to you for help with?",
    icon: Users,
  },
  {
    id: "problem_solved",
    title: "Problem Solved",
    description: "A challenge you overcame for yourself",
    question: "What major problem did you solve for yourself?",
    icon: Lightbulb,
  },
];

interface Step1ExpertiseSourceProps {
  strategy: UserStrategy | null;
  onUpdate: (updates: Partial<UserStrategy>) => Promise<void>;
  onValidChange: (isValid: boolean) => void;
}

export function Step1ExpertiseSource({
  strategy,
  onUpdate,
  onValidChange,
}: Step1ExpertiseSourceProps) {
  const [selectedSource, setSelectedSource] = useState<IdeaSource | null>(
    strategy?.idea_source || null
  );
  const [details, setDetails] = useState(strategy?.idea_source_details || "");
  const [yearsExperience, setYearsExperience] = useState<number | "">(
    strategy?.years_experience ?? ""
  );

  // Get the question for the selected source
  const selectedOption = EXPERTISE_SOURCES.find((s) => s.id === selectedSource);

  // Validate on state changes
  useEffect(() => {
    const isValid = !!selectedSource && details.length >= 50;
    onValidChange(isValid);
  }, [selectedSource, details, onValidChange]);

  // Sync from strategy when it changes
  useEffect(() => {
    if (strategy) {
      setSelectedSource(strategy.idea_source);
      setDetails(strategy.idea_source_details || "");
      setYearsExperience(strategy.years_experience ?? "");
    }
  }, [strategy?.id]);

  const handleSourceSelect = async (source: IdeaSource) => {
    setSelectedSource(source);
    await onUpdate({ idea_source: source });
  };

  const handleDetailsChange = async (value: string) => {
    setDetails(value);
    // Debounced save will happen on blur or continue
  };

  const handleDetailsSave = async () => {
    if (details !== strategy?.idea_source_details) {
      await onUpdate({ idea_source_details: details });
    }
  };

  const handleYearsChange = (value: string) => {
    const num = value === "" ? "" : Math.min(50, Math.max(0, parseInt(value) || 0));
    setYearsExperience(num);
  };

  const handleYearsSave = async () => {
    const value = yearsExperience === "" ? null : yearsExperience;
    if (value !== strategy?.years_experience) {
      await onUpdate({ years_experience: value });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Where does your expertise come from?
        </h2>
        <p className="text-muted-foreground mt-2">
          Select the source that best describes where your knowledge originates
        </p>
      </div>

      {/* Source Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXPERTISE_SOURCES.map((source) => {
          const Icon = source.icon;
          const isSelected = selectedSource === source.id;

          return (
            <Card
              key={source.id}
              onClick={() => handleSourceSelect(source.id)}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{source.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{source.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Details Section - Only visible when source is selected */}
      {selectedSource && selectedOption && (
        <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle className="text-lg">{selectedOption.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expertise-details">
                Describe your expertise
                <span className="text-muted-foreground ml-1">(minimum 50 characters)</span>
              </Label>
              <Textarea
                id="expertise-details"
                value={details}
                onChange={(e) => handleDetailsChange(e.target.value)}
                onBlur={handleDetailsSave}
                placeholder="Be specific about what you know and how you learned it..."
                className="min-h-[120px] resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span
                  className={cn(
                    details.length < 50 && details.length > 0 && "text-destructive"
                  )}
                >
                  {details.length} / 50 minimum characters
                </span>
                {details.length >= 50 && (
                  <span className="text-green-600 dark:text-green-400">
                    Requirement met
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="years-experience">
                Years of experience
                <span className="text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Input
                id="years-experience"
                type="number"
                min={0}
                max={50}
                value={yearsExperience}
                onChange={(e) => handleYearsChange(e.target.value)}
                onBlur={handleYearsSave}
                placeholder="Enter number of years"
                className="max-w-[200px]"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
