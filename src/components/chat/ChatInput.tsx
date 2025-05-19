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
      className="flex w-full items-center space-x-2 rounded-lg border-0 bg-transparent p-1 shadow-none" // Adjusted for a flatter look within its container
    >
      <Input
        ref={inputRef}
        type="text"
        placeholder={disabled ? "Set API Key to chat" : "Type your message..."}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-1 border border-input bg-background focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 shadow-sm rounded-md px-4 py-2 h-11" // More explicit styling for the input field itself
        disabled={isLoading || disabled}
        aria-label="Chat message input"
      />
      <Button type="submit" size="icon" className="h-11 w-11" disabled={isLoading || disabled || !message.trim()} aria-label="Send message">
        <SendHorizonal className="h-5 w-5" />
      </Button>
    </form>
  );
}
