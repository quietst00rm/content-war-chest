import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, RefreshCw, Loader2, Image, Lightbulb, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePrompt {
  id: string;
  post_id: string;
  concept_number: number;
  concept_name: string;
  category: string;
  description: string;
  rationale: string;
  prompt_text: string;
  created_at: string;
}

interface ImagePromptsDisplayProps {
  postId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  object_metaphor: "Object Metaphor",
  environmental_scene: "Environmental Scene",
  contrast_juxtaposition: "Contrast/Juxtaposition",
  textured_background: "Textured Background",
  unexpected_creative: "Unexpected/Creative",
};

const CATEGORY_COLORS: Record<string, string> = {
  object_metaphor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  environmental_scene: "bg-green-500/10 text-green-500 border-green-500/20",
  contrast_juxtaposition: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  textured_background: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  unexpected_creative: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

export function ImagePromptsDisplay({ postId }: ImagePromptsDisplayProps) {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch image prompts for this post
  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ["image-prompts", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_prompts")
        .select("*")
        .eq("post_id", postId)
        .order("concept_number", { ascending: true });

      if (error) throw error;
      return data as ImagePrompt[];
    },
  });

  // Regenerate prompts mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "generate-image-prompts",
        {
          body: { post_id: postId },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["image-prompts", postId] });
      toast.success("Image prompts regenerated");
    },
    onError: (error) => {
      console.error("Regenerate error:", error);
      toast.error("Failed to regenerate image prompts");
    },
  });

  const handleCopyPrompt = async (prompt: ImagePrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt_text);
      setCopiedId(prompt.id);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy prompt");
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading image prompts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Image className="h-4 w-4" />
          Image Prompts
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => regenerateMutation.mutate()}
          disabled={regenerateMutation.isPending}
        >
          {regenerateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {prompts.length === 0 ? "Generate" : "Regenerate"}
        </Button>
      </div>

      {prompts.length === 0 ? (
        <div className="border border-dashed rounded-lg p-6 text-center">
          <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No image prompts generated yet. Click "Generate" to create 3
            concepts.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {prompt.concept_name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        CATEGORY_COLORS[prompt.category]
                      )}
                    >
                      {CATEGORY_LABELS[prompt.category] || prompt.category}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyPrompt(prompt)}
                    className="shrink-0"
                  >
                    {copiedId === prompt.id ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copy Prompt
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Description */}
                <div>
                  <p className="text-sm text-muted-foreground">
                    {prompt.description}
                  </p>
                </div>

                {/* Rationale */}
                <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                  <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground italic">
                    {prompt.rationale}
                  </p>
                </div>

                {/* Prompt Text */}
                <div className="bg-muted rounded-md p-3">
                  <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                    {prompt.prompt_text}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
