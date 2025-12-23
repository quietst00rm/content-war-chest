import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { Folder } from "@/pages/Content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Folder as FolderIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderListProps {
  folders: Folder[];
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onRefetch: () => void;
}

export function FolderList({
  folders,
  selectedFolder,
  onSelectFolder,
  onRefetch,
}: FolderListProps) {
  const { currentUser } = useUser();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("folders_new").insert({
        user_id: currentUser.id,
        name,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder created");
      setNewFolderName("");
      setShowAddDialog(false);
      onRefetch();
    },
    onError: () => {
      toast.error("Failed to create folder");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("folders_new").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["content-posts"] });
      toast.success("Folder deleted");
      if (selectedFolder) {
        onSelectFolder(null);
      }
      onRefetch();
    },
    onError: () => {
      toast.error("Failed to delete folder");
    },
  });

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    createMutation.mutate(newFolderName.trim());
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Folders</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Folder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
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
          onClick={() => onSelectFolder(null)}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2",
            selectedFolder === null
              ? "bg-secondary text-secondary-foreground"
              : "hover:bg-muted"
          )}
        >
          <FolderIcon className="h-4 w-4" />
          <span>All Folders</span>
        </button>
        <button
          onClick={() => onSelectFolder("unfiled")}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2",
            selectedFolder === "unfiled"
              ? "bg-secondary text-secondary-foreground"
              : "hover:bg-muted"
          )}
        >
          <FolderIcon className="h-4 w-4" />
          <span>Unfiled</span>
        </button>

        {folders.map((folder) => (
          <div
            key={folder.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm group",
              selectedFolder === folder.id
                ? "bg-secondary text-secondary-foreground"
                : "hover:bg-muted"
            )}
          >
            <button
              onClick={() => onSelectFolder(folder.id)}
              className="flex-1 flex items-center gap-2 text-left"
            >
              <FolderIcon
                className="h-4 w-4"
                style={{ color: folder.color || undefined }}
              />
              <span className="truncate">{folder.name}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete folder "${folder.name}"?`)) {
                  deleteMutation.mutate(folder.id);
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
