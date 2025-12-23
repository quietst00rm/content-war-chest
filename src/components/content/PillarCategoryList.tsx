import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { PillarCategory } from "@/pages/Content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tag, Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PillarCategoryListProps {
  categories: PillarCategory[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onRefetch: () => void;
}

export function PillarCategoryList({
  categories,
  selectedCategory,
  onSelectCategory,
  onRefetch,
}: PillarCategoryListProps) {
  const { currentUser } = useUser();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const maxSortOrder = Math.max(...categories.map((c) => c.sort_order), 0);

      const { error } = await supabase.from("pillar_categories").insert({
        user_id: currentUser.id,
        name,
        sort_order: maxSortOrder + 1,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pillar-categories"] });
      toast.success("Category created");
      setNewCategoryName("");
      setShowAddDialog(false);
      onRefetch();
    },
    onError: () => {
      toast.error("Failed to create category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pillar_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pillar-categories"] });
      toast.success("Category deleted");
      if (selectedCategory) {
        onSelectCategory(null);
      }
      onRefetch();
    },
    onError: () => {
      toast.error("Failed to delete category");
    },
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createMutation.mutate(newCategoryName.trim());
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Pillar Categories
        </h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Pillar Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name..."
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1">
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2",
            selectedCategory === null
              ? "bg-secondary text-secondary-foreground"
              : "hover:bg-muted"
          )}
        >
          <Tag className="h-4 w-4" />
          <span>All Categories</span>
        </button>

        {categories.map((category) => (
          <div
            key={category.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm group",
              selectedCategory === category.name
                ? "bg-secondary text-secondary-foreground"
                : "hover:bg-muted"
            )}
          >
            <button
              onClick={() => onSelectCategory(category.name)}
              className="flex-1 flex items-center gap-2 text-left"
            >
              <Tag
                className="h-4 w-4"
                style={{ color: category.color || undefined }}
              />
              <span className="truncate">{category.name}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete category "${category.name}"?`)) {
                  deleteMutation.mutate(category.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
