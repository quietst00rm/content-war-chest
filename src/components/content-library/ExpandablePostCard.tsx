import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check, ChevronDown, ChevronUp, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getCategoryEmoji, getCategoryStyle } from "@/lib/categories";
import type { Post } from "@/pages/Index";
import { format } from "date-fns";

interface ExpandablePostCardProps {
  post: Post;
  onUpdate: () => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (postId: string) => void;
  isExpanded: boolean;
  onToggleExpand: (postId: string) => void;
}

export const ExpandablePostCard = ({ 
  post, 
  onUpdate,
  selectionMode,
  isSelected,
  onToggleSelection,
  isExpanded,
  onToggleExpand,
}: ExpandablePostCardProps) => {
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
  
  // Preview: 3 lines with ellipsis
  const previewLines = post.content.split('\n').filter(line => line.trim()).slice(0, 3).join('\n');
  const preview = previewLines.length > 200 ? previewLines.slice(0, 200) + "..." : previewLines;
  
  const visibleTags = post.tags?.slice(0, 4) || [];
  const remainingTagsCount = (post.tags?.length || 0) - 4;

  const isLongPost = (post.character_count || 0) > 3000;

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelection(post.id);
    } else {
      onToggleExpand(post.id);
    }
  };

  return (
    <Card
      className="p-5 cursor-pointer transition-all relative border-border hover:border-muted-foreground/50 bg-card"
      onClick={handleCardClick}
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div 
          className="absolute top-4 right-4 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(post.id)}
            className="h-5 w-5"
          />
        </div>
      )}

      {/* Header: Category Badge + Chevron */}
      <div className="flex items-center justify-between mb-3">
        <Badge
          style={{
            backgroundColor: categoryStyle.backgroundColor,
            color: categoryStyle.color,
            border: 'none',
          }}
          className="font-medium text-sm px-3 py-1 rounded-full"
        >
          {categoryEmoji} {post.primary_category}
        </Badge>
        {!selectionMode && (
          <button 
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(post.id);
            }}
          >
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-lg mb-3 text-foreground line-clamp-2">{post.title}</h3>

      {/* Preview with blockquote styling */}
      {!isExpanded ? (
        <div className="mb-4 border-l-[3px] border-primary pl-4">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{preview}</p>
        </div>
      ) : (
        <div
          className="mb-4 border-l-[3px] border-primary pl-4 bg-secondary/50 p-4 rounded-r-md max-h-[400px] overflow-y-auto"
          style={{ whiteSpace: "pre-wrap", fontFamily: "system-ui, sans-serif" }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-muted-foreground leading-relaxed">{post.content}</p>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {visibleTags.map((tag) => (
          <Badge 
            key={tag} 
            variant="secondary" 
            className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground font-normal lowercase"
          >
            {tag}
          </Badge>
        ))}
        {remainingTagsCount > 0 && (
          <Badge variant="secondary" className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground font-normal">
            +{remainingTagsCount} more
          </Badge>
        )}
      </div>

      {/* Bottom Row: Character Count & Copy Button / Used Badge */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {isLongPost && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
          <span>{post.character_count || 0} chars</span>
        </div>
        
        {!isExpanded ? (
          post.is_used && post.used_at ? (
            <Badge variant="secondary" className="text-xs">
              Used {format(new Date(post.used_at), "MMM d")}
            </Badge>
          ) : (
            <Button
              onClick={handleCopy}
              size="sm"
              className="h-8 px-3 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy
            </Button>
          )
        ) : null}
      </div>

      {/* Action Buttons (when expanded) */}
      {isExpanded && (
        <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              onClick={handleCopy}
              size="sm"
              className="h-8 px-3 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button 
              onClick={handleAutoFormat} 
              variant="outline"
              size="sm"
              className="h-8 px-3 text-sm"
              disabled={isFormatting}
            >
              {isFormatting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Formatting...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Auto-format
                </>
              )}
            </Button>
            <Button 
              onClick={handleMarkAsUsed} 
              variant="outline" 
              size="sm"
              className="h-8 px-3 text-sm"
              disabled={isFormatting}
            >
              {post.is_used ? "Mark Unused" : "Mark Used"}
            </Button>
            <Button
              onClick={() => setShowNotes(!showNotes)}
              variant="outline"
              size="sm"
              className="h-8 px-3 text-sm"
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
