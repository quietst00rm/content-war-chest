import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ExternalLink,
  Copy,
  Check,
  MessageCircle,
  Heart,
  Share2,
  CheckCircle,
  EyeOff,
  User,
  Sparkles,
} from "lucide-react";

interface AIComment {
  type: "experience" | "value-add" | "question";
  text: string;
}

interface AICommentsData {
  comments: AIComment[];
  generated_at: string;
}

export interface EngagementPost {
  id: string;
  profile_id: string;
  linkedin_post_url: string;
  author_name: string | null;
  author_profile_url: string | null;
  author_profile_image_url: string | null;
  author_title: string | null;
  content: string;
  posted_at: string | null;
  posted_ago_text: string | null;
  days_ago: number;
  likes: number;
  comments: number;
  shares: number;
  ai_comment: string | null;
  is_commented: boolean;
  is_hidden: boolean;
  fetched_at: string;
}

interface EngagementPostCardProps {
  post: EngagementPost;
}

const TYPE_LABELS: Record<string, string> = {
  experience: "Experience",
  "value-add": "Value-Add",
  question: "Question",
};

export const EngagementPostCard = ({ post }: EngagementPostCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedCommentIndex, setCopiedCommentIndex] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Parse existing AI comments from database
  const parseAIComments = (): AICommentsData | null => {
    if (!post.ai_comment) return null;
    try {
      const parsed = JSON.parse(post.ai_comment);
      if (parsed.comments && Array.isArray(parsed.comments)) {
        return parsed as AICommentsData;
      }
      return null;
    } catch {
      return null;
    }
  };

  const aiComments = parseAIComments();

  // Mark as commented mutation
  const markCommentedMutation = useMutation({
    mutationFn: async (commented: boolean) => {
      const { error } = await supabase
        .from("engagement_posts")
        .update({
          is_commented: commented,
          commented_at: commented ? new Date().toISOString() : null,
        })
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: (_, commented) => {
      queryClient.invalidateQueries({ queryKey: ["engagement-posts"] });
      toast.success(commented ? "Marked as commented" : "Unmarked");
    },
    onError: () => {
      toast.error("Failed to update");
    },
  });

  // Hide post mutation
  const hideMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("engagement_posts")
        .update({ is_hidden: true })
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["engagement-posts"] });
      toast.success("Post hidden");
    },
    onError: () => {
      toast.error("Failed to hide post");
    },
  });

  const handleCopyComment = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommentIndex(index);
      setTimeout(() => setCopiedCommentIndex(null), 2000);
      toast.success("Comment copied!");
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedCommentIndex(index);
      setTimeout(() => setCopiedCommentIndex(null), 2000);
      toast.success("Comment copied!");
    }
  };

  const handleOpenPost = () => {
    window.open(post.linkedin_post_url, "_blank", "noopener,noreferrer");
  };

  // Format time display
  const timeDisplay = post.posted_ago_text || (post.days_ago === 0 ? "Today" : `${post.days_ago}d ago`);

  // Truncate content for preview
  const contentPreview = post.content.length > 300 && !expanded
    ? post.content.slice(0, 300) + "..."
    : post.content;

  return (
    <Card className={`p-4 transition-all ${post.is_commented ? "opacity-60 bg-muted/30" : "bg-card"}`}>
      {/* Header: Author + Time */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
            {post.author_profile_image_url ? (
              <img 
                src={post.author_profile_image_url} 
                alt={post.author_name || "Author"} 
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{post.author_name || "Unknown"}</p>
            {post.author_title && (
              <p className="text-xs text-muted-foreground truncate">{post.author_title}</p>
            )}
          </div>
        </div>
        <Badge variant="secondary" className="flex-shrink-0 text-xs">
          {timeDisplay}
        </Badge>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {contentPreview}
        </p>
        {post.content.length > 300 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline mt-1"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Engagement Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" />
          {post.likes}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.comments}
        </span>
        <span className="flex items-center gap-1">
          <Share2 className="h-3.5 w-3.5" />
          {post.shares}
        </span>
      </div>

      {/* AI Comment Blocks */}
      {aiComments && aiComments.comments.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-medium">AI Comment Options</span>
          </div>

          {aiComments.comments.map((comment, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 mb-1.5">
                    {TYPE_LABELS[comment.type] || comment.type}
                  </Badge>
                  <p className="text-sm leading-relaxed">{comment.text}</p>
                </div>
                <Button
                  variant={copiedCommentIndex === index ? "default" : "outline"}
                  size="sm"
                  className="h-11 w-11 p-0 flex-shrink-0"
                  onClick={() => handleCopyComment(index, comment.text)}
                >
                  {copiedCommentIndex === index ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No AI comments message */}
      {!aiComments && (
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20">
          <p className="text-xs text-muted-foreground text-center">
            AI comments will be generated when posts are fetched
          </p>
        </div>
      )}

      {/* Action Buttons - Large tap targets for mobile */}
      <div className="flex flex-col gap-2">
        {/* Primary Action: Open Post */}
        <Button
          onClick={handleOpenPost}
          size="lg"
          className="w-full h-12 text-base font-medium"
        >
          <ExternalLink className="h-5 w-5 mr-2" />
          Open Post
        </Button>

        {/* Secondary Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => markCommentedMutation.mutate(!post.is_commented)}
            variant={post.is_commented ? "secondary" : "outline"}
            size="lg"
            className="flex-1 h-11"
            disabled={markCommentedMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {post.is_commented ? "Done" : "Mark Done"}
          </Button>

          <Button
            onClick={() => hideMutation.mutate()}
            variant="ghost"
            size="lg"
            className="h-11 w-11 p-0"
            disabled={hideMutation.isPending}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
