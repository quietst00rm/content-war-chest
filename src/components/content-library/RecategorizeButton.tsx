import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";

interface RecategorizeButtonProps {
  onComplete: () => void;
}

export const RecategorizeButton = ({ onComplete }: RecategorizeButtonProps) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleRecategorize = async () => {
    if (!confirm("This will re-categorize ALL posts using AI. This may take several minutes. Continue?")) {
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: 0 });

    try {
      // Fetch all posts
      const { data: posts, error: fetchError } = await supabase
        .from("posts")
        .select("id, content");

      if (fetchError) throw fetchError;
      if (!posts || posts.length === 0) {
        toast({ title: "No posts to recategorize" });
        return;
      }

      setProgress({ current: 0, total: posts.length });

      // Call edge function to recategorize
      const { data, error } = await supabase.functions.invoke("recategorize-posts", {
        body: { posts },
      });

      if (error) throw error;

      toast({
        title: "Recategorization complete!",
        description: `Successfully recategorized ${data.updated} posts.`,
      });

      onComplete();
    } catch (error: any) {
      console.error("Error recategorizing posts:", error);
      toast({
        title: "Recategorization failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  return (
    <Button
      onClick={handleRecategorize}
      disabled={processing}
      variant="outline"
      size="sm"
    >
      {processing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {progress ? `${progress.current}/${progress.total}` : "Processing..."}
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Recategorize All Posts
        </>
      )}
    </Button>
  );
};
