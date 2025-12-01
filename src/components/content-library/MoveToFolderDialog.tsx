import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, FolderX } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Array<{ id: string; name: string; color: string }>;
  onSelectFolder: (folderId: string | null) => void;
}

export const MoveToFolderDialog = ({
  open,
  onOpenChange,
  folders,
  onSelectFolder,
}: MoveToFolderDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
          <DialogDescription>
            Select a destination folder for the selected posts.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onSelectFolder(null)}
            >
              <FolderX className="h-4 w-4 mr-2" style={{ color: "#6b7280" }} />
              Remove from folder
            </Button>

            {folders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No folders available. Create a folder first.
              </p>
            ) : (
              folders.map((folder) => (
                <Button
                  key={folder.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onSelectFolder(folder.id)}
                >
                  <Folder className="h-4 w-4 mr-2" style={{ color: folder.color }} />
                  {folder.name}
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
