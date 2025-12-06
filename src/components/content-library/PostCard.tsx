import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { getCategoryEmoji, getCategoryStyle } from "@/lib/categories";
import type { Post } from "@/pages/Index";

interface PostCardProps {
  post: Post;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (postId: string) => void;
  onOpenModal: (post: Post) => void;
}

export const PostCard = ({
  post,
  selectionMode,
  isSelected,
  onToggleSelection,
  onOpenModal,
}: PostCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!", description: "Post is ready to paste on LinkedIn." });
  };

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelection(post.id);
    } else {
      onOpenModal(post);
    }
  };

  const categoryStyle = getCategoryStyle(post.primary_category);
  const categoryEmoji = getCategoryEmoji(post.primary_category);

  // Preview: first 2 lines only
  const previewLines = post.content.split('\n').filter(line => line.trim()).slice(0, 2).join(' ');
  const preview = previewLines.length > 100 ? previewLines.slice(0, 100) + "..." : previewLines;

  const visibleTags = post.tags?.slice(0, 3) || [];

  return (
    <Card
      className="h-[220px] p-4 cursor-pointer transition-all duration-200 relative border-border hover:border-primary/40 bg-card flex flex-col hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_4px_24px_rgba(37,99,235,0.15)]"
      onClick={handleCardClick}
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div
          className="absolute top-3 right-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(post.id)}
            className="h-5 w-5"
          />
        </div>
      )}

      {/* Category + Used Badge Row */}
      <div className="flex items-center gap-2">
        <Badge
          style={{
            backgroundColor: categoryStyle.backgroundColor,
            color: categoryStyle.color,
            border: 'none',
          }}
          className="text-xs font-medium px-2 py-0.5 rounded-full w-fit"
        >
          {categoryEmoji} {post.primary_category}
        </Badge>
        {post.is_used && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/20 text-success">
            Used
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground mt-2 mb-1 line-clamp-2 leading-tight">
        {post.title}
      </h3>

      {/* Preview Text - fills available space */}
      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
        {preview}
      </p>

      {/* Tags Row */}
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-6 mb-2">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="text-xs uppercase text-secondary-foreground/80 bg-secondary px-2 py-0.5 rounded border border-border/50"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Character count + Copy button - pinned to bottom */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {post.character_count || 0} chars
        </span>
        {!selectionMode && (
          <Button
            onClick={handleCopy}
            size="sm"
            className="h-7 px-3 text-xs"
          >
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        )}
      </div>
    </Card>
  );
};