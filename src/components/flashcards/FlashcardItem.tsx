
"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

interface FlashcardItemProps {
  front: string;
  back: string;
}

export function FlashcardItem({ front, back }: FlashcardItemProps) {
  const [isFlipped, setIsFlipped] = React.useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Estimate height based on content length for smoother flip (optional)
  const frontHeight = Math.max(150, Math.ceil(front.length / 2.5) * 10 + 60); // Heuristic
  const backHeight = Math.max(150, Math.ceil(back.length / 2.5) * 10 + 60);
  const cardHeight = isFlipped ? backHeight : frontHeight;


  return (
    <Card
      className={cn(
        "h-[200px] md:h-[250px] cursor-pointer transition-all duration-500 transform-style-preserve-3d shadow-lg hover:shadow-xl relative flex flex-col justify-center items-center text-center",
        "bg-card text-card-foreground",
        isFlipped ? "[transform:rotateY(180deg)]" : ""
      )}
      onClick={handleFlip}
      style={{ minHeight: `${cardHeight}px` }}
    >
      <CardContent
        className={cn(
          "absolute inset-0 flex flex-col justify-center items-center p-4 backface-hidden overflow-auto"
        )}
      >
        <p className="text-lg font-medium">{front}</p>
      </CardContent>
      <CardContent
        className={cn(
          "absolute inset-0 flex flex-col justify-center items-center p-4 backface-hidden [transform:rotateY(180deg)] overflow-auto",
           "bg-accent text-accent-foreground" // Use accent for the back for contrast
        )}
      >
        <p className="text-md">{back}</p>
      </CardContent>
      <RotateCcw className="absolute bottom-2 right-2 h-4 w-4 text-muted-foreground/50 opacity-70 group-hover:opacity-100 transition-opacity" />

      <style jsx>{`
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden; /* Safari */
        }
      `}</style>
    </Card>
  );
}
