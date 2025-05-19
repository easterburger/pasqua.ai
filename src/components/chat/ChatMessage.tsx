
"use client";

import * as React from "react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, FileText, Download, ClipboardCopy } from "lucide-react";
import { PasquaIcon } from "@/components/icons/PasquaIcon"; // Changed from Bot
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Helper function to process message text
const processMessageContent = (textContent: string | React.ReactNode): React.ReactNode => {
  if (typeof textContent === 'string') {
    // Remove markdown-like bold/italic asterisks
    const cleanedText = textContent
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
      .replace(/\*(.*?)\*/g, '$1');    // Remove italic *text*

    // Handle line breaks
    return cleanedText.split('\n').map((line, index, arr) => (
      <React.Fragment key={index}>
        {line}
        {index < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  }
  // If it's already a ReactNode (e.g., an error message from localStorage), return as is
  if (React.isValidElement(textContent) || Array.isArray(textContent)) {
    return textContent;
  }
  // Fallback for other object types that might have been stored and are not valid React children
  if (typeof textContent === 'object' && textContent !== null) {
    return "[Error message: Content cannot be displayed after reload]";
  }
  return textContent;
};


export function ChatMessage({ sender, text, media, isStreaming, timestamp }: ChatMessage) {
  const isUser = sender === "user";
  const { toast } = useToast();

  let contentToRender = text;
  if (typeof text === 'object' && text !== null && !React.isValidElement(text) && !Array.isArray(text)) {
    contentToRender = "[Error message: Content cannot be displayed after reload]";
  }
  
  const displayedText = isUser ? contentToRender : processMessageContent(contentToRender);

  const handleDownload = () => {
    if (media) {
      const link = document.createElement('a');
      link.href = media.dataUri;
      link.download = media.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopy = async () => {
    if (typeof text === 'string') { // Always copy the raw string text
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied to clipboard!",
        });
      } catch (err) {
        console.error("Failed to copy text: ", err);
        toast({
          title: "Failed to copy",
          description: "Could not copy text to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-4 group/message",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm shrink-0">
          {/* AI uses PasquaIcon, transparent background for the fallback to let icon color shine */}
          <AvatarFallback className="bg-transparent text-primary">
            <PasquaIcon className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      
      {isUser ? (
        // User message styling: in a box with accent background
        <div
          className={cn(
            "relative max-w-[80%] rounded-lg px-4 py-3 shadow-md break-words flex flex-col gap-2",
            "bg-accent text-accent-foreground rounded-br-none" // User messages get the accent color
          )}
        >
          {media && (
            <div className="mt-1 p-2 rounded-md bg-opacity-20 backdrop-blur-sm"
                 style={{ backgroundColor: 'rgba(0,0,0,0.05)'}}> {/* Standardized subtle media background */}
              {media.type.startsWith("image/") ? (
                <Image
                  src={media.dataUri}
                  alt={media.name || "Uploaded image"}
                  width={300}
                  height={200}
                  className="rounded-md object-contain max-h-64 w-auto"
                  data-ai-hint="uploaded image"
                />
              ) : media.type === "application/pdf" ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-dashed border-current">
                  <FileText className="h-8 w-8 shrink-0" />
                  <span className="truncate text-sm" title={media.name}>{media.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    className="ml-auto h-7 w-7"
                    aria-label="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-md border border-dashed border-current">
                   <FileText className="h-8 w-8 shrink-0" />
                   <span className="truncate text-sm" title={media.name}>{media.name} (Unsupported type)</span>
                </div>
              )}
            </div>
          )}
          {/* User text content */}
          {(typeof displayedText === 'string' && displayedText.trim()) || React.isValidElement(displayedText) || Array.isArray(displayedText) ? (
            <div>{isStreaming && sender === "ai" ? `${displayedText}▌` : displayedText}</div>
          ) : null}
          {!displayedText && !media && isStreaming && sender === "ai" && (
            <div>▌</div>
          )}
           {!displayedText && !media && !isStreaming && (
            <div className="italic opacity-80">(empty message)</div>
          )}
        </div>
      ) : (
        // AI message styling: no box, text directly on background
        <div className="flex-1 flex flex-col items-start max-w-[80%] group relative pt-0.5"> {/* pt-0.5 to align text better with avatar center */}
          {media && (
             <div className="mt-1 mb-2 p-2 rounded-md bg-card border border-border"> {/* Media for AI in a subtle card */}
              {media.type.startsWith("image/") ? (
                <Image
                  src={media.dataUri}
                  alt={media.name || "Uploaded image"}
                  width={300}
                  height={200}
                  className="rounded-md object-contain max-h-64 w-auto"
                  data-ai-hint="uploaded image"
                />
              ) : media.type === "application/pdf" ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-dashed border-current">
                  <FileText className="h-8 w-8 shrink-0" />
                  <span className="truncate text-sm" title={media.name}>{media.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    className="ml-auto h-7 w-7"
                    aria-label="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-md border border-dashed border-current">
                   <FileText className="h-8 w-8 shrink-0" />
                   <span className="truncate text-sm" title={media.name}>{media.name} (Unsupported type)</span>
                </div>
              )}
            </div>
          )}
          {/* AI text content */}
          <div className="text-foreground break-words w-full">
            {(typeof displayedText === 'string' && displayedText.trim()) || React.isValidElement(displayedText) || Array.isArray(displayedText) ? (
               isStreaming ? <>{displayedText}▌</> : displayedText
            ) : null}
          </div>

          {!displayedText && !media && isStreaming && (
            <div className="text-foreground">▌</div>
          )}
           {!displayedText && !media && !isStreaming && (
            <div className="italic text-muted-foreground">(empty message)</div>
          )}

          {!isUser && !isStreaming && typeof text === 'string' && text.trim() && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              // Positioned to the right of the text flow, appears on hover of the message item.
              className="absolute top-0 -right-8 h-7 w-7 text-muted-foreground opacity-0 group-hover/message:opacity-100 transition-opacity"
              aria-label="Copy message"
            >
              <ClipboardCopy className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground"> {/* User avatar remains primary */}
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

