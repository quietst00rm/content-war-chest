import { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BulkImportDialog = ({ open, onOpenChange, onSuccess }: BulkImportDialogProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const parsePosts = (text: string): string[] => {
    // Split by "Post X" or "### **Post X**" patterns
    const postRegex = /(?:^|\n)(?:###\s*\*\*Post\s+\d+\*\*|Post\s+\d+)[\s\n]/gi;
    const parts = text.split(postRegex);
    
    // Filter out empty parts and section headers
    return parts
      .map(p => p.trim())
      .filter(p => p && p.length > 50 && !p.match(/^#\s+(Gemini|GPT|Claude)/i));
  };

  const handleImport = async () => {
    if (!content.trim()) {
      toast({ title: "Please paste content to import", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "You must be logged in to import posts", variant: "destructive" });
      return;
    }

    setImporting(true);
    const posts = parsePosts(content);
    setProgress({ current: 0, total: posts.length });

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < posts.length; i++) {
        setProgress({ current: i + 1, total: posts.length });

        try {
          // Analyze each post with AI
          const { data, error } = await supabase.functions.invoke("analyze-post", {
            body: { content: posts[i] },
          });

          if (error) throw error;

          // Save to database
          await supabase.from("posts").insert({
            title: data.title,
            content: posts[i],
            formatted_content: data.formatted_content,
            primary_category: data.primary_category,
            subcategory: data.subcategory,
            tags: data.tags,
            target_audience: data.target_audience,
            summary: data.summary,
            character_count: data.character_count,
            user_id: user.id,
          });

          successCount++;
        } catch (error) {
          console.error(`Error importing post ${i + 1}:`, error);
          errorCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "Import complete!",
        description: `Successfully imported ${successCount} posts. ${errorCount} errors.`,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Bulk import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleClose = () => {
    if (!importing) {
      setContent("");
      setProgress({ current: 0, total: 0 });
      onOpenChange(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleClose}
      title="Bulk Import Posts"
      description='Paste multiple posts separated by "Post X" markers. Each post will be analyzed with AI and added to your library.'
      className="max-w-3xl"
    >
      <div className="space-y-4 sm:space-y-6">
          <div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your posts here... Posts should be separated by 'Post 1', 'Post 2', etc."
              rows={15}
              disabled={importing}
            />
          </div>

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing posts...</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={importing || !content.trim()}
            className="w-full min-h-[44px]"
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing {progress.current}/{progress.total}...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Posts
              </>
            )}
          </Button>
        </div>
    </ResponsiveDialog>
  );
};
