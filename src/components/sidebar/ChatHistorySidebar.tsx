
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PasquaIcon } from "@/components/icons/PasquaIcon";
import { Edit3, MessageSquare, Trash2 } from "lucide-react";
import type { ChatSession } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';

interface ChatHistorySidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
  className?: string;
}

export function ChatHistorySidebar({
  chatSessions,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  className,
}: ChatHistorySidebarProps) {
  const sortedSessions = React.useMemo(() => {
    return [...chatSessions]
      .filter(session => !session.isTemporary) // Only show non-temporary chats in history
      .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
  }, [chatSessions]);

  return (
    <Sidebar className={className} side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PasquaIcon className="h-7 w-7 text-primary" />
            <h2 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">History</h2>
          </div>
          <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <SidebarMenu className="px-2 py-2">
            {sortedSessions.map((session) => (
              <SidebarMenuItem key={session.id} className="relative group/item">
                <SidebarMenuButton
                  onClick={() => onSelectChat(session.id)}
                  isActive={session.id === activeChatId}
                  className="justify-start w-full text-left h-auto py-2 px-2 group-data-[collapsible=icon]:justify-center"
                  tooltip={session.title}
                >
                  <MessageSquare className="h-4 w-4" />
                  <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
                    <span className="truncate text-sm font-medium">{session.title || "New Chat"}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.lastUpdatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </SidebarMenuButton>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/item:opacity-100 group-data-[collapsible=icon]:hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(session.id);
                  }}
                  aria-label="Delete chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-border">
         <Button 
            variant="outline" 
            className="w-full justify-center group-data-[collapsible=icon]:justify-center"
            onClick={onNewChat}
            aria-label="New Chat"
          >
            <Edit3 className="h-4 w-4" />
           <span className="ml-2 group-data-[collapsible=icon]:hidden">New Chat</span>
         </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
