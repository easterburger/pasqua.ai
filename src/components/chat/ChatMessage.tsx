
"use client";

import type { ChatMessage } from "@/lib/types"; // Updated import
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

// Removed internal ChatMessageProps, will use ChatMessage from lib/types

export function ChatMessage({ sender, text, isStreaming }: ChatMessage) { // Updated prop type
  const isUser = sender === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 shadow-md break-words", // Added break-words
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none" // Changed user message bg to primary
            : "bg-card text-card-foreground rounded-bl-none" // Changed AI message bg to card
        )}
      >
        {typeof text === 'string' && isStreaming ? `${text}▌` : text}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm">
          <AvatarFallback className="bg-accent text-accent-foreground"> {/* Changed user avatar bg to accent */}
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

