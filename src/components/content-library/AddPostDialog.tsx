import { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import { CATEGORIES, getCategoryEmoji } from "@/lib/categories";

interface AddPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AnalyzedPost {
  title: string;
  primary_category: string;
  tags: string[];
  formatted_content: string;
  character_count: number;
}

export const AddPostDialog = ({ open, onOpenChange, onSuccess }: AddPostDialogProps) => {
  const [content, setContent] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState<AnalyzedPost | null>(null);
  const [editMode, setEditMode] = useState(false);

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast({ title: "Please enter post content", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-post", {
        body: { content: content.trim() },
      });

      if (error) throw error;

      setAnalyzed(data);
      toast({ title: "Post analyzed successfully!", description: "Review the AI suggestions below." });
    } catch (error: any) {
      console.error("Error analyzing post:", error);
      toast({
        title: "Failed to analyze post",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analyzed) return;

    try {
      const { error } = await supabase.from("posts").insert({
        title: analyzed.title,
        content: content.trim(),
        formatted_content: analyzed.formatted_content,
        primary_category: analyzed.primary_category,
        tags: analyzed.tags,
        character_count: analyzed.character_count,
      });

      if (error) throw error;

      toast({ title: "Post added successfully!" });
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error saving post:", error);
      toast({
        title: "Failed to save post",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setContent("");
    setAnalyzed(null);
    setEditMode(false);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleClose}
      title="Add New LinkedIn Post"
      description="Paste your LinkedIn post content and let AI analyze and categorize it."
      className="max-w-3xl"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Content Input */}
        <div>
          <Label htmlFor="content">Post Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your LinkedIn post here..."
            rows={10}
            className="mt-2"
            disabled={!!analyzed && !editMode}
          />
        </div>

        {!analyzed ? (
          <Button onClick={handleAnalyze} disabled={analyzing} className="w-full min-h-[44px]">
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze with AI
              </>
            )}
          </Button>
        ) : (
          <>
            {/* AI Analysis Results */}
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">AI Analysis Results</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>
                  {editMode ? "Cancel Edit" : "Edit"}
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  {editMode ? (
                    <Input
                      value={analyzed.title}
                      onChange={(e) => setAnalyzed({ ...analyzed, title: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{analyzed.title}</p>
                  )}
                </div>

                <div>
                  <Label>Category</Label>
                  {editMode ? (
                    <Select
                      value={analyzed.primary_category}
                      onValueChange={(value) => setAnalyzed({ ...analyzed, primary_category: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.name} value={cat.name}>
                            {getCategoryEmoji(cat.name)} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="mt-1">
                      {getCategoryEmoji(analyzed.primary_category)} {analyzed.primary_category}
                    </Badge>
                  )}
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {analyzed.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Character Count</Label>
                  <p className="mt-1 text-sm">{analyzed.character_count} characters</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleSave} className="flex-1 min-h-[44px]">
                Save to Library
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAnalyzed(null);
                  setEditMode(false);
                }}
                className="min-h-[44px]"
              >
                Re-analyze
              </Button>
            </div>
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
};
