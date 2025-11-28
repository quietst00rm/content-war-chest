import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Star, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PostDetailDialog } from "./PostDetailDialog";
import type { Post } from "@/pages/Index";

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

export const PostCard = ({ post, onUpdate }: PostCardProps) => {
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(post.formatted_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!", description: "Post is ready to paste on LinkedIn." });
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("posts").update({ is_favorite: !post.is_favorite }).eq("id", post.id);
    onUpdate();
    toast({
      title: post.is_favorite ? "Removed from favorites" : "Added to favorites",
    });
  };

  const snippet = post.content.slice(0, 150) + (post.content.length > 150 ? "..." : "");

  return (
    <>
      <Card
        className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-lg line-clamp-2">{post.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFavorite}
            className={post.is_favorite ? "text-yellow-500" : ""}
          >
            <Star className={`h-5 w-5 ${post.is_favorite ? "fill-current" : ""}`} />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{snippet}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">{post.primary_category}</Badge>
          {post.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {post.character_count && <span>{post.character_count} characters</span>}
            {post.is_used && <span className="ml-3 text-green-600">✓ Used</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </Card>

      <PostDetailDialog
        post={post}
        open={showDetail}
        onOpenChange={setShowDetail}
        onUpdate={onUpdate}
      />
    </>
  );
};
