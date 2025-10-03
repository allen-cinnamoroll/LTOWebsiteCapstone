import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Car, Calendar, Wrench, Palette, Building } from "lucide-react";
import { formatSimpleDate } from "@/util/dateFormatter";
import { Badge as StatusBadge } from "@/components/ui/badge";

const FileNumberDisplay = ({ fileNumbers, vehicles, onFileNumberClick }) => {
  const [showAllModal, setShowAllModal] = useState(false);
  
  // Ensure fileNumbers is an array
  const files = Array.isArray(fileNumbers) ? fileNumbers : [fileNumbers];
  const validFiles = files.filter(file => file && file.trim() !== "");
  
  if (validFiles.length === 0) {
    return <span className="text-gray-500 text-xs">N/A</span>;
  }

  if (validFiles.length === 1) {
    return (
      <button
        onClick={() => onFileNumberClick(validFiles[0])}
        className="text-blue-600 hover:text-blue-800 font-medium text-xs cursor-pointer hover:underline"
      >
        {validFiles[0]}
      </button>
    );
  }

  const visibleFiles = validFiles.slice(0, 2);
  const remainingCount = validFiles.length - 2;

  return (
    <>
      <div className="flex flex-wrap gap-1 items-center">
        {visibleFiles.map((file, index) => (
          <button
            key={index}
            onClick={() => onFileNumberClick(file)}
            className="text-blue-600 hover:text-blue-800 font-medium text-xs cursor-pointer hover:underline"
          >
            {file}
          </button>
        ))}
        
        {remainingCount > 0 && (
          <>
            <span className="text-gray-500 text-xs">,</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllModal(true)}
              className="text-blue-600 hover:text-blue-800 text-xs p-0 h-auto font-medium"
            >
              see more ({remainingCount})
            </Button>
          </>
        )}
      </div>

      {/* Modal to show all file numbers */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              All File Numbers
            </DialogTitle>
            <DialogDescription>
              Click on any file number to view vehicle details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {validFiles.map((file, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">File Number</p>
                        <button
                          onClick={() => {
                            onFileNumberClick(file);
                            setShowAllModal(false);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-lg cursor-pointer hover:underline"
                        >
                          {file}
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Click to view details</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileNumberDisplay;
