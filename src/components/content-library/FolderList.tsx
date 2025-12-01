import { Folder, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FolderData {
  id: string;
  name: string;
  color: string;
}

interface FolderListProps {
  folders: FolderData[];
  posts: any[];
  selectedFolder: string | null;
  onFolderChange: (folderId: string | null) => void;
}

export const FolderList = ({
  folders,
  posts,
  selectedFolder,
  onFolderChange,
}: FolderListProps) => {
  const getPostCount = (folderId: string | null) => {
    if (folderId === null) {
      return posts.length;
    }
    if (folderId === "unfiled") {
      return posts.filter((p) => !p.folder_id).length;
    }
    return posts.filter((p) => p.folder_id === folderId).length;
  };

  const allPostsCount = posts.length;
  const unfiledCount = posts.filter((p) => !p.folder_id).length;

  return (
    <div className="space-y-2">
      <button
        onClick={() => onFolderChange(null)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted/50 ${
          selectedFolder === null
            ? "bg-muted text-primary font-medium"
            : "text-muted-foreground"
        }`}
      >
        <span className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" style={{ color: "#6b7280" }} />
          All Posts
        </span>
        <Badge variant="secondary" className="text-xs">
          {allPostsCount}
        </Badge>
      </button>

      {unfiledCount > 0 && (
        <button
          onClick={() => onFolderChange("unfiled")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted/50 ${
            selectedFolder === "unfiled"
              ? "bg-muted text-primary font-medium"
              : "text-muted-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <Folder className="h-4 w-4" style={{ color: "#6b7280" }} />
            Unfiled
          </span>
          <Badge variant="secondary" className="text-xs">
            {unfiledCount}
          </Badge>
        </button>
      )}

      {folders.map((folder) => {
        const count = getPostCount(folder.id);
        return (
          <button
            key={folder.id}
            onClick={() => onFolderChange(folder.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted/50 ${
              selectedFolder === folder.id
                ? "bg-muted text-primary font-medium"
                : "text-muted-foreground"
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Folder className="h-4 w-4 flex-shrink-0" style={{ color: folder.color }} />
              <span className="truncate">{folder.name}</span>
            </span>
            <Badge variant="secondary" className="text-xs ml-2">
              {count}
            </Badge>
          </button>
        );
      })}

      {folders.length === 0 && (
        <p className="text-xs text-muted-foreground px-3 py-2">
          No folders yet. Create one to organize your posts.
        </p>
      )}
    </div>
  );
};
