
"use client";

import * as React from "react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, FileText, Download, ClipboardCopy } from "lucide-react";
import { PasquaIcon } from "@/components/icons/PasquaIcon";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Helper function to process message text
const processMessageContent = (textContent: string | React.ReactNode): React.ReactNode[] => {
  // Guard clauses for non-string inputs
  if (typeof textContent !== 'string') {
    if (React.isValidElement(textContent)) return [textContent]; // Already a valid React element
    if (Array.isArray(textContent)) return textContent; // Already an array of nodes
    if (typeof textContent === 'object' && textContent !== null) {
      // This case handles objects that were likely React elements but got stringified/parsed from localStorage
      return [<span key="error_reload" className="italic text-muted-foreground">{"[Content may not display correctly after reload. Please try regenerating.]"}</span>];
    }
    return textContent ? [String(textContent)] : []; // Fallback for other types or empty
  }

  const elements: React.ReactNode[] = [];
  const lines = textContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Heading detection and styling (applied first)
    if (line.startsWith('# ')) {
      line = line.substring(2).replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();
      elements.push(<span key={`line-${i}`} className="block text-xl font-semibold mt-3 mb-1.5 leading-tight">{line}</span>);
      continue;
    } else if (line.startsWith('## ')) {
      line = line.substring(3).replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();
      elements.push(<span key={`line-${i}`} className="block text-lg font-semibold mt-2 mb-1 leading-tight">{line}</span>);
      continue;
    } else if (line.startsWith('### ')) {
      line = line.substring(4).replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();
      elements.push(<span key={`line-${i}`} className="block text-base font-semibold mt-1.5 mb-0.5 leading-tight">{line}</span>);
      continue;
    }

    // Horizontal rule detection (e.g., "---", "***", "___")
    if (line.match(/^(\s*([*\-_])\s*){3,}\s*$/)) {
        elements.push(<hr key={`line-${i}`} className="my-3 border-border/50" />);
        continue;
    }
    
    // General asterisk removal and basic markdown symbol cleanup for non-heading lines
    line = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
    line = line.replace(/^(\s*-\s+|\s*\*\s*|\s*>\s*)/, ''); // remove list/quote markers at line start

    if (line.trim() === "") {
      if (elements.length > 0) {
        const lastElement = elements[elements.length - 1];
        if (typeof lastElement === 'string' || (React.isValidElement(lastElement) && lastElement.type === 'br')) {
           if (elements.length > 0 && ! (React.isValidElement(lastElement) && (lastElement.type === 'hr' || (typeof lastElement.props?.className === 'string' && lastElement.props.className.includes('block')) ) ) ) {
             elements.push(<br key={`break-empty-${i}`} />);
           }
        }
      }
      continue; 
    }
    
    elements.push(line);

    if (i < lines.length - 1) {
        const nextLine = lines[i+1];
        if (!nextLine.match(/^#{1,3}\s/) && !nextLine.match(/^(\s*([*\-_])\s*){3,}\s*$/) && nextLine.trim() !== "") {
            elements.push(<br key={`break-text-${i}`} />);
        }
    }
  }
  return elements.filter(el => el !== null && el !== undefined); 
};


export function ChatMessage({ sender, text, media, isStreaming, timestamp }: ChatMessage) {
  const isUser = sender === "user";
  const { toast } = useToast();

  const displayedText = !isStreaming ? processMessageContent(text) : (typeof text === 'string' ? text : "");


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
    const textToCopy = typeof text === 'string' ? text : (React.isValidElement(text) ? (text.props.children as string) : '');
    if (textToCopy) { 
      try {
        await navigator.clipboard.writeText(textToCopy);
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
        <Avatar className="h-8 w-8 border border-border shadow-sm shrink-0 self-start mt-1">
          <AvatarFallback className="bg-transparent text-primary">
            <PasquaIcon className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      
      {isUser ? (
        <div
          className={cn(
            "relative max-w-[80%] rounded-lg px-4 py-3 shadow-md break-words flex flex-col gap-2",
            "bg-accent text-accent-foreground rounded-br-none" 
          )}
        >
          {media && (
            <div className="mt-1 p-2 rounded-md bg-opacity-20 backdrop-blur-sm"
                 style={{ backgroundColor: 'rgba(0,0,0,0.05)'}}> 
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
          {(typeof text === 'string' && text.trim()) || React.isValidElement(text) || (Array.isArray(text) && text.length >0) ? (
            <div>{text}</div>
          ) : null}
           {!text && !media && (
            <div className="italic opacity-80">(empty message)</div>
          )}
        </div>
      ) : (
        // AI message styling
        <div className="flex-1 flex flex-col items-start max-w-[80%] group relative">
          {media && (
             <div className="mt-1 mb-2 p-2 rounded-md bg-card border border-border"> 
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
          <div className="text-foreground break-words w-full leading-relaxed mt-1"> {/* Added mt-1 for spacing below icon */}
            {isStreaming ? (
              <>
                {displayedText} {/* Show processed text even while streaming if possible, or raw 'text' */}
                <span className="inline-block animate-pulse">▌</span>
              </>
            ) : (
              displayedText // This is React.ReactNode[] from processMessageContent
            )}
          </div>

          {!isStreaming && !media && (!text || (typeof text === 'string' && text.trim() === '')) && (!displayedText || (Array.isArray(displayedText) && displayedText.length === 0)) && (
            <div className="italic text-muted-foreground">(empty message)</div>
          )}
          
          {isStreaming && !media && (!text || (typeof text === 'string' && text.trim() === '')) && (
             <div className="text-foreground"><span className="inline-block animate-pulse">▌</span></div>
          )}


          {!isUser && !isStreaming && typeof text === 'string' && text.trim() && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="absolute top-0 -right-8 h-7 w-7 text-muted-foreground opacity-0 group-hover/message:opacity-100 transition-opacity"
              aria-label="Copy message"
            >
              <ClipboardCopy className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm shrink-0 self-start mt-1">
          <AvatarFallback className="bg-primary text-primary-foreground"> 
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

