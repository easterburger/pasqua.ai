
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Changed from Input to Textarea for multiline
import { SendHorizonal, PlusCircle, Mic } from "lucide-react"; // Added icons

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, isLoading, disabled = false }: ChatInputProps) {
  const [message, setMessage] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scroll height
    }
  }, [message]);


  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex w-full items-end space-x-2 rounded-xl border border-border bg-card p-2 shadow-sm"
    >
      {/* Placeholder for attachment button */}
      {/* <Button type="button" variant="ghost" size="icon" className="shrink-0" disabled={isLoading || disabled}>
        <PlusCircle className="h-5 w-5" />
      </Button> */}
      <Textarea
        ref={textareaRef}
        placeholder={disabled ? "Set API Key to chat" : "Ask anything..."}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[2.75rem] max-h-48 overflow-y-auto" // Adjusted styling for textarea
        disabled={isLoading || disabled}
        aria-label="Chat message input"
        rows={1}
      />
      {/* Placeholder for Mic button */}
      {/* <Button type="button" variant="ghost" size="icon" className="shrink-0" disabled={isLoading || disabled}>
        <Mic className="h-5 w-5" />
      </Button> */}
      <Button 
        type="submit" 
        size="icon" 
        className="shrink-0 h-9 w-9 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-muted" 
        disabled={isLoading || disabled || !message.trim()} 
        aria-label="Send message"
      >
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </form>
  );
}
