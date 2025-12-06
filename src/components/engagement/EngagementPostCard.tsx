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
  Eye,
  EyeOff,
  User,
  Sparkles,
} from "lucide-react";

export interface EngagementPost {
  id: string;
  profile_id: string;
  linkedin_post_url: string;
  author_name: string | null;
  author_profile_url: string | null;
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

export const EngagementPostCard = ({ post }: EngagementPostCardProps) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

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

  const handleCopyContent = async () => {
    await navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Content copied");
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
            <User className="h-5 w-5 text-primary" />
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

      {/* AI Comment Placeholder */}
      {post.ai_comment ? (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 text-xs text-primary mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-medium">Suggested Comment</span>
          </div>
          <p className="text-sm">{post.ai_comment}</p>
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI comment suggestions coming soon</span>
          </div>
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
            onClick={handleCopyContent}
            variant="outline"
            size="lg"
            className="flex-1 h-11"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>

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
