
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
  useSidebar, 
} from "@/components/ui/sidebar";
import { SheetTitle } from "@/components/ui/sheet"; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { PasquaIcon } from "@/components/icons/PasquaIcon";
import { Edit3, MessageSquare, Trash2, Layers, Mic, FileQuestion, BookOpenCheck } from "lucide-react"; 
import type { ChatSession } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';
import Link from "next/link"; 

interface ChatHistorySidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
  isLoading: boolean; 
  className?: string;
}

export function ChatHistorySidebar({
  chatSessions,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isLoading, 
  className,
}: ChatHistorySidebarProps) {
  const { isMobile, toggleSidebar, state: sidebarState } = useSidebar(); 

  const sortedSessions = React.useMemo(() => {
    return [...chatSessions]
      .filter(session => !session.isTemporary) 
      .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
  }, [chatSessions]);

  return (
    <Sidebar className={className} side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Link href="/" passHref>
                <PasquaIcon className="h-7 w-7 text-primary cursor-pointer" />
             </Link>
            {isMobile ? (
              <SheetTitle className="text-lg font-semibold group-data-[collapsible=icon]:hidden">Menu</SheetTitle>
            ) : (
              <h2 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">Pasqua AI</h2>
            )}
          </div>
          {!isMobile && <SidebarTrigger onClick={toggleSidebar} disabled={isLoading} />}
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <SidebarMenu className="px-2 py-2">
             <SidebarMenuItem>
                 <SidebarMenuButton
                    onClick={onNewChat}
                    className="justify-start w-full text-left h-auto py-2 px-2 group-data-[collapsible=icon]:justify-center bg-primary/10 hover:bg-primary/20 text-primary"
                    tooltip="New Chat"
                    disabled={isLoading}
                >
                    <Edit3 className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">New Chat</span>
                </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/flashcards" passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={typeof window !== 'undefined' && window.location.pathname === "/flashcards"}
                  className="justify-start w-full text-left h-auto py-2 px-2 group-data-[collapsible=icon]:justify-center"
                  tooltip="Flashcards"
                  disabled={isLoading} 
                >
                  <a>
                    <Layers className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Flashcards</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <Link href="/podcast" passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={typeof window !== 'undefined' && window.location.pathname === "/podcast"}
                  className="justify-start w-full text-left h-auto py-2 px-2 group-data-[collapsible=icon]:justify-center"
                  tooltip="Podcast Script Generator"
                  disabled={isLoading}
                >
                  <a>
                    <Mic className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Podcast Scripts</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <Link href="/test-maker" passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={typeof window !== 'undefined' && window.location.pathname === "/test-maker"}
                  className="justify-start w-full text-left h-auto py-2 px-2 group-data-[collapsible=icon]:justify-center"
                  tooltip="Test Maker"
                  disabled={isLoading}
                >
                  <a>
                    <FileQuestion className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Test Maker</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <Link href="/study-guide" passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={typeof window !== 'undefined' && window.location.pathname === "/study-guide"}
                  className="justify-start w-full text-left h-auto py-2 px-2 group-data-[collapsible=icon]:justify-center"
                  tooltip="Study Guide Creator"
                  disabled={isLoading}
                >
                  <a>
                    <BookOpenCheck className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Study Guides</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>


            {sortedSessions.length > 0 && (
                 <div className="my-2 px-2 text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
                    Chat History
                </div>
            )}
            {sortedSessions.map((session) => (
              <SidebarMenuItem key={session.id} className="relative group/item">
                <SidebarMenuButton
                  onClick={() => onSelectChat(session.id)}
                  isActive={session.id === activeChatId}
                  className="justify-start w-full text-left h-auto py-2 px-2 group-data-[collapsible=icon]:justify-center"
                  tooltip={session.title}
                  disabled={isLoading} 
                >
                  <MessageSquare className="h-4 w-4" />
                  <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
                    <span className="truncate text-sm font-medium">{session.title || "New Chat"}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.lastUpdatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </SidebarMenuButton>
                {sidebarState === "expanded" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/item:opacity-100 group-data-[collapsible=icon]:hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(session.id);
                    }}
                    aria-label="Delete chat"
                    disabled={isLoading} 
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
        <div className="text-xs text-muted-foreground text-center">
            Pasqua AI Chat
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

