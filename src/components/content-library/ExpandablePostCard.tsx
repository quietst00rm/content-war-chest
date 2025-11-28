import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, ChevronDown, ChevronUp, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getCategoryEmoji, getCategoryStyle } from "@/lib/categories";
import type { Post } from "@/pages/Index";
import { format } from "date-fns";

interface ExpandablePostCardProps {
  post: Post;
  onUpdate: () => void;
}

export const ExpandablePostCard = ({ post, onUpdate }: ExpandablePostCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState(post.notes || "");
  const [showNotes, setShowNotes] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!", description: "Post is ready to paste on LinkedIn." });
  };

  const handleMarkAsUsed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase
      .from("posts")
      .update({
        is_used: !post.is_used,
        used_at: !post.is_used ? new Date().toISOString() : null,
        usage_count: post.is_used ? Math.max(0, post.usage_count - 1) : post.usage_count + 1,
      })
      .eq("id", post.id);
    onUpdate();
    toast({
      title: post.is_used ? "Marked as unused" : "Marked as used",
    });
  };

  const handleSaveNotes = async () => {
    await supabase.from("posts").update({ notes }).eq("id", post.id);
    onUpdate();
    toast({ title: "Notes saved" });
    setShowNotes(false);
  };

  const handleAutoFormat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFormatting(true);

    try {
      const { data, error } = await supabase.functions.invoke('format-post', {
        body: { content: post.content }
      });

      if (error) throw error;

      const formattedContent = data.formatted_content;

      await supabase
        .from("posts")
        .update({
          content: formattedContent,
          character_count: formattedContent.length
        })
        .eq("id", post.id);

      onUpdate();
      toast({
        title: "✓ Post formatted!",
        description: "Content updated successfully."
      });
    } catch (error: any) {
      console.error('Auto-format error:', error);
      toast({
        title: "Formatting failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsFormatting(false);
    }
  };

  const categoryStyle = getCategoryStyle(post.primary_category);
  const categoryEmoji = getCategoryEmoji(post.primary_category);
  
  const previewLines = post.content.split('\n').slice(0, 2).join('\n');
  const preview = previewLines.length > 150 ? previewLines.slice(0, 150) + "..." : previewLines;
  
  const visibleTags = post.tags?.slice(0, 4) || [];
  const remainingTagsCount = (post.tags?.length || 0) - 4;

  const isLongPost = (post.character_count || 0) > 3000;

  return (
    <Card
      className="p-6 cursor-pointer hover:shadow-lg transition-all"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Category Badge */}
      <div className="flex items-center justify-between mb-3">
        <Badge
          style={{
            backgroundColor: categoryStyle.backgroundColor,
            color: categoryStyle.color,
            border: 'none',
          }}
          className="font-medium"
        >
          {categoryEmoji} {post.primary_category}
        </Badge>
        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-lg mb-3 line-clamp-2">{post.title}</h3>

      {/* Preview or Full Content */}
      {!expanded ? (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{preview}</p>
      ) : (
        <div
          className="mb-4 max-h-[400px] overflow-y-auto text-sm rounded-md bg-muted/30 p-4"
          style={{ whiteSpace: "pre-wrap", fontFamily: "system-ui, sans-serif" }}
          onClick={(e) => e.stopPropagation()}
        >
          {post.content}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {visibleTags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
        {remainingTagsCount > 0 && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            +{remainingTagsCount} more
          </Badge>
        )}
      </div>

      {/* Bottom Row: Character Count & Used Badge */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          {isLongPost && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
          <span>{post.character_count || 0} chars</span>
        </div>
        {post.is_used && post.used_at && (
          <Badge variant="secondary" className="text-xs">
            Used {format(new Date(post.used_at), "MMM d")}
          </Badge>
        )}
      </div>

      {/* Action Buttons (when expanded) */}
      {expanded && (
        <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleAutoFormat} 
              variant="outline" 
              className="flex-1 min-h-[44px] border-purple-500 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-950"
              disabled={isFormatting}
            >
              {isFormatting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Formatting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Auto-Format
                </>
              )}
            </Button>
            <Button onClick={handleCopy} className="flex-1 min-h-[44px]" disabled={isFormatting}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
            <Button onClick={handleMarkAsUsed} variant="secondary" className="flex-1 min-h-[44px]" disabled={isFormatting}>
              {post.is_used ? "Mark as Unused" : "Mark as Used"}
            </Button>
            <Button
              onClick={() => setShowNotes(!showNotes)}
              variant="secondary"
              className="min-h-[44px]"
              disabled={isFormatting}
            >
              {showNotes ? "Hide Note" : "Add Note"}
            </Button>
          </div>

          {/* Notes Field */}
          {showNotes && (
            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this post..."
                rows={3}
              />
              <Button onClick={handleSaveNotes} size="sm" className="w-full">
                Save Notes
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
