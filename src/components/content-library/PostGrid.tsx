import { useState } from "react";
import { PostCard } from "./PostCard";
import { PostModal } from "./PostModal";
import type { Post } from "@/pages/Index";

interface PostGridProps {
  posts: Post[];
  isLoading: boolean;
  onUpdate: () => void;
  viewMode: "grid" | "list";
  selectionMode: boolean;
  selectedPostIds: Set<string>;
  onToggleSelection: (postId: string) => void;
  folders: Array<{ id: string; name: string; color: string }>;
}

export const PostGrid = ({
  posts,
  isLoading,
  onUpdate,
  viewMode,
  selectionMode,
  selectedPostIds,
  onToggleSelection,
  folders,
}: PostGridProps) => {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = (post: Post) => {
    setSelectedPost(post);
    setModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setSelectedPost(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-52 rounded-lg bg-muted animate-pulse" />
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
    <>
      <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-4"}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            selectionMode={selectionMode}
            isSelected={selectedPostIds.has(post.id)}
            onToggleSelection={onToggleSelection}
            onOpenModal={handleOpenModal}
          />
        ))}
      </div>

      <PostModal
        post={selectedPost}
        open={modalOpen}
        onOpenChange={handleCloseModal}
        onUpdate={onUpdate}
        folders={folders}
      />
    </>
  );
};
