import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type UserStrategy = Tables<"user_strategy">;
export type UserStrategyInsert = TablesInsert<"user_strategy">;
export type UserStrategyUpdate = TablesUpdate<"user_strategy">;

// Type-safe field values
export type IdeaSource = NonNullable<UserStrategy["idea_source"]>;
export type TargetMarket = NonNullable<UserStrategy["target_market"]>;
export type PrimaryOutcome = NonNullable<UserStrategy["primary_outcome"]>;
export type ValidationEnjoyment = NonNullable<UserStrategy["validation_enjoyment"]>;
export type ValidationLearning = NonNullable<UserStrategy["validation_learning"]>;
export type ValidationLongevity = NonNullable<UserStrategy["validation_longevity"]>;
export type ValidationStatus = NonNullable<UserStrategy["validation_status"]>;

interface UseUserStrategyReturn {
  strategy: UserStrategy | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  updateStrategy: (updates: UserStrategyUpdate) => Promise<void>;
  updateField: <K extends keyof UserStrategyUpdate>(field: K, value: UserStrategyUpdate[K]) => Promise<void>;
  completeStage1: () => Promise<void>;
  calculateValidationScore: (
    enjoyment: ValidationEnjoyment | null,
    learning: ValidationLearning | null,
    longevity: ValidationLongevity | null
  ) => { score: number; status: ValidationStatus };
  refetch: () => void;
}

export function useUserStrategy(): UseUserStrategyReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Fetch user strategy
  const {
    data: strategy,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-strategy", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_strategy")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: UserStrategyUpdate) => {
      if (!user?.id) throw new Error("User not authenticated");

      setSaveStatus("saving");

      // If strategy exists, update it
      if (strategy?.id) {
        const { data, error } = await supabase
          .from("user_strategy")
          .update(updates)
          .eq("id", strategy.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new strategy record
        const { data, error } = await supabase
          .from("user_strategy")
          .insert({
            user_id: user.id,
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user-strategy", user?.id], data);
      setSaveStatus("saved");
      // Reset to idle after a short delay
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
  });

  // Update strategy with partial updates
  const updateStrategy = useCallback(
    async (updates: UserStrategyUpdate) => {
      await updateMutation.mutateAsync(updates);
    },
    [updateMutation]
  );

  // Update a single field
  const updateField = useCallback(
    async <K extends keyof UserStrategyUpdate>(field: K, value: UserStrategyUpdate[K]) => {
      await updateStrategy({ [field]: value } as UserStrategyUpdate);
    },
    [updateStrategy]
  );

  // Calculate validation score
  const calculateValidationScore = useCallback(
    (
      enjoyment: ValidationEnjoyment | null,
      learning: ValidationLearning | null,
      longevity: ValidationLongevity | null
    ): { score: number; status: ValidationStatus } => {
      let score = 0;

      // Enjoyment: yes=3, somewhat=1, no=0
      if (enjoyment === "yes") score += 3;
      else if (enjoyment === "somewhat") score += 1;

      // Learning: yes=3, somewhat=1, no=0
      if (learning === "yes") score += 3;
      else if (learning === "somewhat") score += 1;

      // Longevity: yes=3, probably=2, unsure=1, no=0
      if (longevity === "yes") score += 3;
      else if (longevity === "probably") score += 2;
      else if (longevity === "unsure") score += 1;

      // Determine status
      let status: ValidationStatus;
      if (score >= 7) status = "strong";
      else if (score >= 4) status = "moderate";
      else status = "weak";

      return { score, status };
    },
    []
  );

  // Complete Stage 1
  const completeStage1 = useCallback(async () => {
    if (!strategy) throw new Error("No strategy to complete");

    const { score, status } = calculateValidationScore(
      strategy.validation_enjoyment,
      strategy.validation_learning,
      strategy.validation_longevity
    );

    const valueStatement = strategy.who_you_help && strategy.what_you_help_them_do
      ? `I help ${strategy.who_you_help} ${strategy.what_you_help_them_do}.`
      : null;

    await updateStrategy({
      validation_score: score,
      validation_status: status,
      value_statement_seed: valueStatement,
      stage_1_completed: true,
      stage_1_completed_at: new Date().toISOString(),
    });
  }, [strategy, calculateValidationScore, updateStrategy]);

  return {
    strategy,
    isLoading,
    isSaving: updateMutation.isPending,
    error: error as Error | null,
    saveStatus,
    updateStrategy,
    updateField,
    completeStage1,
    calculateValidationScore,
    refetch,
  };
}

// Helper function to get outcomes for a market
export function getOutcomesForMarket(market: TargetMarket | null): PrimaryOutcome[] {
  if (!market) return [];

  switch (market) {
    case "health":
      return ["health_fitness", "attractiveness"];
    case "wealth":
      return ["make_money", "save_money", "save_time"];
    case "relationships":
      return ["attractiveness", "peace_of_mind"];
    default:
      return [];
  }
}

// Helper to check if an outcome is valid for a market
export function isOutcomeValidForMarket(outcome: PrimaryOutcome, market: TargetMarket): boolean {
  return getOutcomesForMarket(market).includes(outcome);
}
