
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal, Paperclip, XCircle, FileText, ImageIcon } from "lucide-react";
import type { ChatMessageMedia } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSendMessage: (message: string, media?: ChatMessageMedia) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function ChatInput({ onSendMessage, isLoading, disabled = false }: ChatInputProps) {
  const [message, setMessage] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<ChatMessageMedia | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File Too Large",
          description: `Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedFile({
          name: file.name,
          type: file.type,
          dataUri: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset file input to allow selecting the same file again if removed
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if ((message.trim() || selectedFile) && !isLoading && !disabled) {
      onSendMessage(message.trim(), selectedFile || undefined);
      setMessage("");
      setSelectedFile(null);
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
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
    >
      {selectedFile && (
        <div className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedFile.type.startsWith("image/") ? (
              <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <span className="truncate text-foreground" title={selectedFile.name}>{selectedFile.name}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={removeSelectedFile}
            disabled={isLoading}
            aria-label="Remove selected file"
          >
            <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      )}
      <div className="flex w-full items-end space-x-2">
        <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="shrink-0 h-9 w-9 text-muted-foreground hover:text-primary" 
            onClick={triggerFilePicker}
            disabled={isLoading || disabled}
            aria-label="Attach file"
        >
            <Paperclip className="h-5 w-5" />
        </Button>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,application/pdf"
            disabled={isLoading || disabled}
        />
        <Textarea
            ref={textareaRef}
            placeholder={disabled ? "Set API Key to chat" : (selectedFile ? "Add a message..." : "Ask anything or attach a file...")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[2.75rem] max-h-48 overflow-y-auto"
            disabled={isLoading || disabled}
            aria-label="Chat message input"
            rows={1}
        />
        <Button 
            type="submit" 
            size="icon" 
            className="shrink-0 h-9 w-9 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-muted" 
            disabled={isLoading || disabled || (!message.trim() && !selectedFile)} 
            aria-label="Send message"
        >
            <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
