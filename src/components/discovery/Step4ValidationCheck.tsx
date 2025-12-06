import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { UserStrategy, ValidationEnjoyment, ValidationLearning, ValidationLongevity } from "@/hooks/use-user-strategy";
import { Heart, Brain, Clock } from "lucide-react";

interface ValidationQuestion {
  id: "enjoyment" | "learning" | "longevity";
  question: string;
  icon: typeof Heart;
  options: Array<{
    value: string;
    label: string;
  }>;
}

const VALIDATION_QUESTIONS: ValidationQuestion[] = [
  {
    id: "enjoyment",
    question: "Do you actually enjoy doing this?",
    icon: Heart,
    options: [
      { value: "yes", label: "Yes" },
      { value: "somewhat", label: "Somewhat" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "learning",
    question: "Are you excited to keep learning about this topic?",
    icon: Brain,
    options: [
      { value: "yes", label: "Yes" },
      { value: "somewhat", label: "Somewhat" },
      { value: "no", label: "No" },
    ],
  },
  {
    id: "longevity",
    question: "Will you still enjoy this 6-12 months from now?",
    icon: Clock,
    options: [
      { value: "yes", label: "Yes" },
      { value: "probably", label: "Probably" },
      { value: "unsure", label: "Unsure" },
      { value: "no", label: "No" },
    ],
  },
];

interface Step4ValidationCheckProps {
  strategy: UserStrategy | null;
  onUpdate: (updates: Partial<UserStrategy>) => Promise<void>;
  onValidChange: (isValid: boolean) => void;
}

export function Step4ValidationCheck({
  strategy,
  onUpdate,
  onValidChange,
}: Step4ValidationCheckProps) {
  const [enjoyment, setEnjoyment] = useState<ValidationEnjoyment | null>(
    strategy?.validation_enjoyment || null
  );
  const [learning, setLearning] = useState<ValidationLearning | null>(
    strategy?.validation_learning || null
  );
  const [longevity, setLongevity] = useState<ValidationLongevity | null>(
    strategy?.validation_longevity || null
  );
  const [expansionPotential, setExpansionPotential] = useState(
    strategy?.expansion_potential || ""
  );

  // Validate on state changes
  useEffect(() => {
    const isValid = !!enjoyment && !!learning && !!longevity;
    onValidChange(isValid);
  }, [enjoyment, learning, longevity, onValidChange]);

  // Sync from strategy when it changes
  useEffect(() => {
    if (strategy) {
      setEnjoyment(strategy.validation_enjoyment);
      setLearning(strategy.validation_learning);
      setLongevity(strategy.validation_longevity);
      setExpansionPotential(strategy.expansion_potential || "");
    }
  }, [strategy?.id]);

  const handleEnjoymentChange = async (value: ValidationEnjoyment) => {
    setEnjoyment(value);
    await onUpdate({ validation_enjoyment: value });
  };

  const handleLearningChange = async (value: ValidationLearning) => {
    setLearning(value);
    await onUpdate({ validation_learning: value });
  };

  const handleLongevityChange = async (value: ValidationLongevity) => {
    setLongevity(value);
    await onUpdate({ validation_longevity: value });
  };

  const handleExpansionSave = async () => {
    if (expansionPotential !== strategy?.expansion_potential) {
      await onUpdate({ expansion_potential: expansionPotential || null });
    }
  };

  // Helper to get value for a question
  const getValue = (id: "enjoyment" | "learning" | "longevity") => {
    switch (id) {
      case "enjoyment":
        return enjoyment;
      case "learning":
        return learning;
      case "longevity":
        return longevity;
      default:
        return null;
    }
  };

  // Helper to handle change for a question
  const handleChange = (id: "enjoyment" | "learning" | "longevity", value: string) => {
    switch (id) {
      case "enjoyment":
        handleEnjoymentChange(value as ValidationEnjoyment);
        break;
      case "learning":
        handleLearningChange(value as ValidationLearning);
        break;
      case "longevity":
        handleLongevityChange(value as ValidationLongevity);
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Let's validate this idea
        </h2>
        <p className="text-muted-foreground mt-2">
          Answer honestly — the best ideas are ones you'll stick with long-term
        </p>
      </div>

      {/* Validation Questions */}
      <div className="space-y-4">
        {VALIDATION_QUESTIONS.map((q) => {
          const Icon = q.icon;
          const value = getValue(q.id);

          return (
            <Card key={q.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base font-medium">
                    {q.question}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={value || undefined}
                  onValueChange={(v) => handleChange(q.id, v)}
                  className="flex flex-wrap gap-3"
                >
                  {q.options.map((option) => (
                    <div key={option.value} className="flex items-center">
                      <RadioGroupItem
                        value={option.value}
                        id={`${q.id}-${option.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`${q.id}-${option.value}`}
                        className={cn(
                          "px-4 py-2 rounded-lg border cursor-pointer transition-all",
                          "hover:border-primary/50",
                          value === option.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border"
                        )}
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Expansion Potential */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            What related topics could you expand into over time?
          </CardTitle>
          <CardDescription>
            Optional — helps identify future growth potential
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={expansionPotential}
            onChange={(e) => setExpansionPotential(e.target.value)}
            onBlur={handleExpansionSave}
            placeholder="List adjacent topics, niches, or skills you could teach in the future..."
            className="min-h-[100px] resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );
}
