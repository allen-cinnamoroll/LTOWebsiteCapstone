import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";

const NoChangesModal = ({ open, onOpenChange, onContinue, onCancel }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            No Changes Detected
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-600">
            No changes were made to the vehicle information. Would you like to continue editing?
          </p>
        </div>

        <DialogFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="min-w-[80px]"
          >
            No
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="min-w-[80px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoChangesModal;
