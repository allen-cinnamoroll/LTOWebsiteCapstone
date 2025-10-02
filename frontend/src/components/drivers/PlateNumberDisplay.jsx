import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PlateNumberDisplay = ({ plateNumbers, maxVisible = 2 }) => {
  // Ensure plateNumbers is an array
  const plates = Array.isArray(plateNumbers) ? plateNumbers : [plateNumbers];
  const validPlates = plates.filter(plate => plate && plate.trim() !== "");
  
  if (validPlates.length === 0) {
    return <span className="text-gray-500 text-xs">No plates</span>;
  }

  if (validPlates.length === 1) {
    return (
      <Badge variant="outline" className="text-xs font-medium">
        {validPlates[0]}
      </Badge>
    );
  }

  const visiblePlates = validPlates.slice(0, maxVisible);
  const remainingCount = validPlates.length - maxVisible;
  const hiddenPlates = validPlates.slice(maxVisible);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1 items-center">
        {visiblePlates.map((plate, index) => (
          <Badge key={index} variant="outline" className="text-xs font-medium">
            {plate}
          </Badge>
        ))}
        
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className="text-xs font-medium cursor-help hover:bg-secondary/80"
              >
                +{remainingCount} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold text-xs">Additional plates:</p>
                <div className="flex flex-wrap gap-1">
                  {hiddenPlates.map((plate, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs"
                    >
                      {plate}
                    </Badge>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default PlateNumberDisplay;
