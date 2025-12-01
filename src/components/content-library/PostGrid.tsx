import { ExpandablePostCard } from "./ExpandablePostCard";
import type { Post } from "@/pages/Index";

interface PostGridProps {
  posts: Post[];
  isLoading: boolean;
  onUpdate: () => void;
  viewMode: "grid" | "list";
  selectionMode: boolean;
  selectedPostIds: Set<string>;
  onToggleSelection: (postId: string) => void;
}

export const PostGrid = ({ 
  posts, 
  isLoading, 
  onUpdate, 
  viewMode,
  selectionMode,
  selectedPostIds,
  onToggleSelection,
}: PostGridProps) => {
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
    <div className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2" : "flex flex-col gap-4"}>
      {posts.map((post) => (
        <ExpandablePostCard 
          key={post.id} 
          post={post} 
          onUpdate={onUpdate}
          selectionMode={selectionMode}
          isSelected={selectedPostIds.has(post.id)}
          onToggleSelection={onToggleSelection}
        />
      ))}
    </div>
  );
};
