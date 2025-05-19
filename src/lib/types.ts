
import type { ReactNode } from 'react';

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string | ReactNode;
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
