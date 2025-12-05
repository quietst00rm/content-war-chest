import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { getCategoryEmoji, getCategoryStyle } from "@/lib/categories";
import type { Post, PostStatus } from "@/pages/Index";

const STATUS_STYLES: Record<PostStatus, { bg: string; text: string; label: string }> = {
  idea: { bg: 'bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', label: 'Idea' },
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-600 dark:text-gray-400', label: 'Draft' },
  ready: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', label: 'Ready' },
  scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', label: 'Scheduled' },
  used: { bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', label: 'Used' },
  archived: { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', label: 'Archived' },
};

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
  const statusStyle = STATUS_STYLES[(post.status as PostStatus) || 'draft'] || STATUS_STYLES['draft'];

  // Preview: first 2 lines only
  const previewLines = post.content.split('\n').filter(line => line.trim()).slice(0, 2).join(' ');
  const preview = previewLines.length > 100 ? previewLines.slice(0, 100) + "..." : previewLines;

  const visibleTags = post.tags?.slice(0, 3) || [];

  return (
    <Card
      className="h-[220px] p-4 cursor-pointer transition-colors duration-150 relative border-border hover:border-muted-foreground/50 bg-card/80 flex flex-col"
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

      {/* Category + Status Row */}
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
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
          {statusStyle.label}
        </span>
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
        <div className="flex flex-wrap gap-1 overflow-hidden max-h-6 mb-2">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="text-xs uppercase text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Character count + Copy button - pinned to bottom */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="text-xs text-muted-foreground/70">
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