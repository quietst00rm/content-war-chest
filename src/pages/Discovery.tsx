import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStrategy } from "@/hooks/use-user-strategy";
import { WizardProgress } from "@/components/discovery/WizardProgress";
import { Step1ExpertiseSource } from "@/components/discovery/Step1ExpertiseSource";
import { Step2MarketAlignment } from "@/components/discovery/Step2MarketAlignment";
import { Step3TargetAudience } from "@/components/discovery/Step3TargetAudience";
import { Step4ValidationCheck } from "@/components/discovery/Step4ValidationCheck";
import { Step5Summary } from "@/components/discovery/Step5Summary";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, Loader2, Save, Home } from "lucide-react";

export default function Discovery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    strategy,
    isLoading,
    isSaving,
    saveStatus,
    updateStrategy,
    completeStage1,
    calculateValidationScore,
  } = useUserStrategy();

  const [currentStep, setCurrentStep] = useState(1);
  const [stepValid, setStepValid] = useState(false);
  const [showWeakConfirmation, setShowWeakConfirmation] = useState(false);

  // Initialize step from strategy when loaded
  useEffect(() => {
    if (strategy && !isLoading) {
      // If stage 1 is completed, show the summary
      if (strategy.stage_1_completed) {
        setCurrentStep(5);
      } else {
        // Resume from saved step
        setCurrentStep(strategy.current_step || 1);
      }
    }
  }, [strategy?.id, isLoading]);

  // Handle step validation changes
  const handleValidChange = useCallback((isValid: boolean) => {
    setStepValid(isValid);
  }, []);

  // Handle continuing to next step
  const handleContinue = async () => {
    if (!stepValid && currentStep !== 5) {
      toast.error("Please complete all required fields before continuing");
      return;
    }

    if (currentStep < 5) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateStrategy({ current_step: nextStep });
    } else {
      // On Step 5, check validation status before completing
      const { status } = calculateValidationScore(
        strategy?.validation_enjoyment || null,
        strategy?.validation_learning || null,
        strategy?.validation_longevity || null
      );

      if (status === "weak") {
        setShowWeakConfirmation(true);
      } else {
        await handleComplete();
      }
    }
  };

  // Handle completing the wizard
  const handleComplete = async () => {
    try {
      await completeStage1();
      toast.success("Stage 1 completed! Redirecting to next stage...");
      // Navigate to /uvp (or wherever Stage 2 starts)
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      toast.error("Failed to complete Stage 1");
      console.error(error);
    }
  };

  // Handle going back
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle editing responses (from summary)
  const handleEdit = () => {
    setCurrentStep(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your progress...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            Discovery Wizard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Save Status Indicator */}
        <div className={cn(
            "flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-all",
            saveStatus === "saving" && "text-muted-foreground",
            saveStatus === "saved" && "text-success",
            saveStatus === "error" && "text-destructive"
          )}>
          {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="h-3 w-3 text-success" />
                <span>Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <Save className="h-3 w-3" />
                <span>Error saving</span>
              </>
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Progress Stepper */}
      <div className="border-b border-border px-4 py-4 sm:py-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <WizardProgress currentStep={currentStep} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
          {currentStep === 1 && (
            <Step1ExpertiseSource
              strategy={strategy}
              onUpdate={updateStrategy}
              onValidChange={handleValidChange}
            />
          )}
          {currentStep === 2 && (
            <Step2MarketAlignment
              strategy={strategy}
              onUpdate={updateStrategy}
              onValidChange={handleValidChange}
            />
          )}
          {currentStep === 3 && (
            <Step3TargetAudience
              strategy={strategy}
              onUpdate={updateStrategy}
              onValidChange={handleValidChange}
            />
          )}
          {currentStep === 4 && (
            <Step4ValidationCheck
              strategy={strategy}
              onUpdate={updateStrategy}
              onValidChange={handleValidChange}
            />
          )}
          {currentStep === 5 && (
            <Step5Summary
              strategy={strategy}
              calculateValidationScore={calculateValidationScore}
            />
          )}
        </div>
      </main>

      {/* Footer Navigation - Sticky on mobile */}
      <footer className="border-t border-border bg-background p-4 sticky bottom-0">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          {currentStep === 5 && strategy?.stage_1_completed ? (
            // Already completed - show edit option
            <Button variant="outline" onClick={handleEdit}>
              Edit Responses
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}

          {currentStep === 5 ? (
            strategy?.stage_1_completed ? (
              <Button onClick={() => navigate("/")}>
                <Check className="mr-2 h-4 w-4" />
                Done
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleEdit}>
                  Edit Responses
                </Button>
                <Button onClick={handleContinue} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Complete & Continue
                    </>
                  )}
                </Button>
              </div>
            )
          ) : (
            <Button
              onClick={handleContinue}
              disabled={!stepValid || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </footer>

      {/* Weak Validation Confirmation Dialog */}
      <AlertDialog open={showWeakConfirmation} onOpenChange={setShowWeakConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Low Validation Score</AlertDialogTitle>
            <AlertDialogDescription>
              Your validation score is low, which may indicate that this idea
              isn't the best fit for a sustainable business. Are you sure you
              want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowWeakConfirmation(false)}>
              Go Back & Revise
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
