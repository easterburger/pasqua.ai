
"use client";

import * as React from "react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

export function ChatMessage({ sender, text, isStreaming }: ChatMessage) {
  const isUser = sender === "user";

  let contentToRender = text;
  // If 'text' is an object, but not a valid React element, it might be a
  // plain object loaded from localStorage after JSON.stringify/parse.
  // In this case, render a placeholder string to avoid crashing.
  if (typeof text === 'object' && text !== null && !React.isValidElement(text)) {
    // This is a fallback. Ideally, React elements shouldn't be stringified
    // into localStorage in a way that makes them non-renderable.
    // For now, provide a user-friendly placeholder.
    contentToRender = "[Error message: Content cannot be displayed after reload]";
  }

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
          "max-w-[80%] rounded-lg px-4 py-3 shadow-md break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none"
        )}
      >
        {typeof contentToRender === 'string' && isStreaming ? `${contentToRender}▌` : contentToRender}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
