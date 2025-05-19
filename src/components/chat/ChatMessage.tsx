"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { PasquaIcon } from "@/components/icons/PasquaIcon";

export interface ChatMessageProps {
  id: string;
  sender: "user" | "ai";
  text: string | React.ReactNode; // Allow ReactNode for potential markdown rendering
  isStreaming?: boolean;
}

export function ChatMessage({ sender, text, isStreaming }: ChatMessageProps) {
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
          {/* Placeholder for AI avatar image if desired */}
          {/* <AvatarImage src="https://placehold.co/40x40.png" alt="AI" /> */}
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-3 shadow-md",
          isUser
            ? "bg-accent text-accent-foreground rounded-br-none"
            : "bg-secondary text-secondary-foreground rounded-bl-none"
        )}
      >
        {typeof text === 'string' && isStreaming ? `${text}▌` : text}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border border-border shadow-sm">
           {/* Placeholder for User avatar image if desired */}
          {/* <AvatarImage src="https://placehold.co/40x40.png" alt="User" /> */}
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
