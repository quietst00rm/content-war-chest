import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Star, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Post } from "@/pages/Index";

interface PostDetailDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const PostDetailDialog = ({ post, open, onOpenChange, onUpdate }: PostDetailDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState(post.notes || "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post.formatted_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!", description: "Post is ready to paste on LinkedIn." });
  };

  const handleMarkAsUsed = async () => {
    await supabase
      .from("posts")
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        usage_count: post.usage_count + 1,
      })
      .eq("id", post.id);
    onUpdate();
    toast({ title: "Marked as used" });
  };

  const handleSaveNotes = async () => {
    await supabase.from("posts").update({ notes }).eq("id", post.id);
    onUpdate();
    toast({ title: "Notes saved" });
  };

  const handleFavorite = async () => {
    await supabase.from("posts").update({ is_favorite: !post.is_favorite }).eq("id", post.id);
    onUpdate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-2xl pr-8">{post.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              className={post.is_favorite ? "text-yellow-500" : ""}
            >
              <Star className={`h-5 w-5 ${post.is_favorite ? "fill-current" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm">
              {post.primary_category}
            </Badge>
            {post.subcategory && <Badge variant="outline">{post.subcategory}</Badge>}
            {post.tags?.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          {post.summary && (
            <div>
              <h4 className="font-semibold mb-2">Summary</h4>
              <p className="text-muted-foreground">{post.summary}</p>
            </div>
          )}

          {/* Formatted Content Preview */}
          <div>
            <h4 className="font-semibold mb-2">LinkedIn-Formatted Content</h4>
            <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
              {post.formatted_content}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleCopy} className="flex-1">
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
            {!post.is_used && (
              <Button onClick={handleMarkAsUsed} variant="secondary">
                Mark as Used
              </Button>
            )}
          </div>

          {/* Notes */}
          <div>
            <h4 className="font-semibold mb-2">Notes</h4>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this post..."
              rows={4}
            />
            <Button onClick={handleSaveNotes} className="mt-2" size="sm">
              Save Notes
            </Button>
          </div>

          {/* Metadata Footer */}
          <div className="text-sm text-muted-foreground space-y-1">
            {post.target_audience && <p>Target Audience: {post.target_audience}</p>}
            {post.character_count && <p>Character Count: {post.character_count}</p>}
            {post.is_used && post.used_at && (
              <p>Used: {new Date(post.used_at).toLocaleDateString()}</p>
            )}
            <p>Usage Count: {post.usage_count}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
