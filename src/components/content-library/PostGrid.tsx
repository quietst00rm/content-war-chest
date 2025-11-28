import { PostCard } from "./PostCard";
import type { Post } from "@/pages/Index";

interface PostGridProps {
  posts: Post[];
  isLoading: boolean;
  onUpdate: () => void;
}

export const PostGrid = ({ posts, isLoading, onUpdate }: PostGridProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No posts found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onUpdate={onUpdate} />
      ))}
    </div>
  );
};
