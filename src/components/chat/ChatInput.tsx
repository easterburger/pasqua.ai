"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizonal } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, isLoading, disabled = false }: ChatInputProps) {
  const [message, setMessage] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      inputRef.current?.focus();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-center space-x-2 rounded-lg border border-border bg-card p-2 shadow-sm"
    >
      <Input
        ref={inputRef}
        type="text"
        placeholder={disabled ? "Set API Key to chat" : "Type your message..."}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
        disabled={isLoading || disabled}
        aria-label="Chat message input"
      />
      <Button type="submit" size="icon" disabled={isLoading || disabled || !message.trim()} aria-label="Send message">
        <SendHorizonal className="h-5 w-5" />
      </Button>
    </form>
  );
}
