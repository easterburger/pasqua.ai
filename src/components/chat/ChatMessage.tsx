
"use client";

import * as React from "react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, FileText, Download, ClipboardCopy } from "lucide-react";
import Image from 'next/image'; // For optimized image display
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ChatMessage({ sender, text, media, isStreaming, timestamp }: ChatMessage) {
  const isUser = sender === "user";
  const { toast } = useToast();

  let contentToRender = text;
  if (typeof text === 'object' && text !== null && !React.isValidElement(text)) {
    contentToRender = "[Error message: Content cannot be displayed after reload]";
  }

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
    if (typeof text === 'string') {
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
        "flex items-start gap-3 py-4 group/message", // Added group/message for hover effects
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "relative max-w-[80%] rounded-lg px-4 py-3 shadow-md break-words flex flex-col gap-2",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none"
        )}
      >
        {media && (
          <div className="mt-1 p-2 rounded-md bg-opacity-20 backdrop-blur-sm"
               style={isUser ? { backgroundColor: 'rgba(255,255,255,0.1)'} : { backgroundColor: 'rgba(0,0,0,0.05)'}}>
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
        {typeof contentToRender === 'string' && contentToRender.trim() && (
          <div>{isStreaming && sender === "ai" ? `${contentToRender}▌` : contentToRender}</div>
        )}
        {!contentToRender && !media && isStreaming && sender === "ai" && (
          <div>{isStreaming && sender === "ai" ? `▌` : ""}</div>
        )}
         {!contentToRender && !media && !isStreaming && (
          <div className="italic text-muted-foreground/80">(empty message)</div>
        )}
        {!isUser && !isStreaming && typeof text === 'string' && text.trim() && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="absolute -top-2 -right-2 h-7 w-7 text-muted-foreground opacity-0 group-hover/message:opacity-100 transition-opacity"
            aria-label="Copy message"
          >
            <ClipboardCopy className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm shrink-0">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
