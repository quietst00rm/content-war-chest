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
  RefreshCw,
} from "lucide-react";

// NEW approach type definitions (updated per task requirements)
type CommentApproach = 'reaction' | 'agreement_with_addition' | 'personal_take' | 'supportive';
type CommentTone = 'casual' | 'professional' | 'playful' | 'empathetic';

// Approach badge styling (updated for new approach types)
const APPROACH_STYLES: Record<CommentApproach, { label: string; className: string }> = {
  reaction: { label: 'reaction', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  agreement_with_addition: { label: 'agreement+', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  personal_take: { label: 'personal', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  supportive: { label: 'supportive', className: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
};

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
  ai_comment_approach?: string | null;
  ai_comment_tone?: string | null;
  is_commented: boolean;
  is_hidden: boolean;
  fetched_at: string;
}

interface EngagementPostCardProps {
  post: EngagementPost;
}

export const EngagementPostCard = ({ post }: EngagementPostCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const queryClient = useQueryClient();

  // Get approach style
  const approachStyle = post.ai_comment_approach
    ? APPROACH_STYLES[post.ai_comment_approach as CommentApproach] || APPROACH_STYLES.reaction
    : null;

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

  // Regenerate comment mutation
  const regenerateCommentMutation = useMutation({
    mutationFn: async () => {
      setIsRegenerating(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke('generate-engagement-comments', {
        body: {
          post_content: post.content,
          author_name: post.author_name || 'Unknown',
          author_title: post.author_title || '',
          regenerate: true,
          previous_approach: post.ai_comment_approach,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;

      // Update the post with the new comment
      const { error: updateError } = await supabase
        .from("engagement_posts")
        .update({
          ai_comment: data.comment,
          ai_comment_approach: data.approach,
          ai_comment_tone: data.tone_matched,
          ai_comment_generated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (updateError) throw updateError;

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["engagement-posts"] });
      toast.success(`New ${data.approach} comment generated`);
      setIsRegenerating(false);
    },
    onError: (error) => {
      console.error("Regeneration error:", error);
      toast.error("Failed to regenerate comment");
      setIsRegenerating(false);
    },
  });

  const handleCopyComment = async () => {
    if (!post.ai_comment) return;

    try {
      await navigator.clipboard.writeText(post.ai_comment);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Comment copied!");
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = post.ai_comment;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  // Get character count display
  const charCount = post.ai_comment?.length || 0;

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

      {/* AI Comment Block - Single Comment */}
      {post.ai_comment && (
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-medium">AI Suggestion</span>
              {approachStyle && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${approachStyle.className}`}>
                  {approachStyle.label}
                </span>
              )}
              <span className="text-muted-foreground">
                {charCount} chars
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => regenerateCommentMutation.mutate()}
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-relaxed flex-1">{post.ai_comment}</p>
              <Button
                variant={copied ? "default" : "outline"}
                size="sm"
                className="h-11 w-11 p-0 flex-shrink-0"
                onClick={handleCopyComment}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* No AI comment message */}
      {!post.ai_comment && (
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              No AI comment generated yet
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => regenerateCommentMutation.mutate()}
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
              Generate
            </Button>
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
