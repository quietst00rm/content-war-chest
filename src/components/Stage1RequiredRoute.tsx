import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Stage1RequiredRouteProps {
  children: ReactNode;
}

export function Stage1RequiredRoute({ children }: Stage1RequiredRouteProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: userStrategy, isLoading } = useQuery({
    queryKey: ["user-strategy-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_strategy")
        .select("stage_1_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isStage1Completed = userStrategy?.stage_1_completed ?? false;

  useEffect(() => {
    if (!isLoading && !isStage1Completed) {
      toast.info("Please complete the Discovery Wizard first", {
        description: "You need to complete Stage 1 before accessing this feature.",
      });
      navigate("/discovery", { replace: true });
    }
  }, [isLoading, isStage1Completed, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking progress...</span>
        </div>
      </div>
    );
  }

  if (!isStage1Completed) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
