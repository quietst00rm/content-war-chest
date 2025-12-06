import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  number: number;
  title: string;
}

const STEPS: Step[] = [
  { number: 1, title: "Expertise Source" },
  { number: 2, title: "Market Alignment" },
  { number: 3, title: "Target Audience" },
  { number: 4, title: "Validation Check" },
  { number: 5, title: "Summary & Results" },
];

interface WizardProgressProps {
  currentStep: number;
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  return (
    <div className="w-full">
      {/* Mobile view: compact */}
      <div className="flex sm:hidden items-center justify-center gap-2 mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          Step {currentStep} of 5
        </span>
        <span className="text-sm text-muted-foreground">-</span>
        <span className="text-sm font-medium">{STEPS[currentStep - 1].title}</span>
      </div>
      <div className="sm:hidden w-full bg-muted rounded-full h-2 mb-4">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / 5) * 100}%` }}
        />
      </div>

      {/* Desktop view: full stepper */}
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                  currentStep > step.number
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep === step.number
                    ? "border-primary text-primary bg-background"
                    : "border-muted-foreground/30 text-muted-foreground bg-background"
                )}
              >
                {currentStep > step.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[80px]",
                  currentStep >= step.number
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-colors",
                  currentStep > step.number ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
