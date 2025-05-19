
import type { ReactNode } from 'react';

export interface ChatMessageMedia {
  name: string;
  type: string; // MIME type
  dataUri: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string | ReactNode;
  media?: ChatMessageMedia;
  isStreaming?: boolean;
  timestamp: number;
}

export interface ChatSession {
  id:string;
  title: string;
  messages: ChatMessage[];
  createdAt: number; // Store as timestamp for easier sorting
  isTemporary?: boolean;
  lastUpdatedAt: number;
}
