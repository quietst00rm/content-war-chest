import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle, Sparkles, FolderInput } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MoveToFolderDialog } from "./MoveToFolderDialog";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onUnselectAll: () => void;
  onDelete: () => void;
  onMarkAsUsed: () => void;
  onAutoFormat: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  folders: Array<{ id: string; name: string; color: string }>;
}

export const BulkActionsBar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onUnselectAll,
  onDelete,
  onMarkAsUsed,
  onAutoFormat,
  onMoveToFolder,
  folders,
}: BulkActionsBarProps) => {
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[320px] max-w-[90vw]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-sm">
                {selectedCount} selected
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={selectedCount === totalCount ? onUnselectAll : onSelectAll}
                className="h-7 text-xs"
              >
                {selectedCount === totalCount ? "Unselect All" : "Select All"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={selectedCount === 0}
              className="h-9"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={onMarkAsUsed}
              disabled={selectedCount === 0}
              className="h-9"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark as Used
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={onAutoFormat}
              disabled={selectedCount === 0}
              className="h-9"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Auto Format
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowMoveDialog(true)}
              disabled={selectedCount === 0}
              className="h-9"
            >
              <FolderInput className="h-4 w-4 mr-1" />
              Move to Folder
            </Button>
          </div>
        </div>
      </div>

      <MoveToFolderDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        folders={folders}
        onSelectFolder={(folderId) => {
          onMoveToFolder(folderId);
          setShowMoveDialog(false);
        }}
      />
    </>
  );
};
