
"use client";

import React from "react";
import type { ChatMessage, ChatSession, ChatMessageMedia } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from 'uuid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage as ChatMessageComponent } from "@/components/chat/ChatMessage";
import { ApiKeyDialog } from "@/components/chat/ApiKeyDialog";
import { API_KEY_LOCAL_STORAGE_KEY, CHAT_SESSIONS_LOCAL_STORAGE_KEY } from "@/lib/constants";
import { PasquaIcon } from "@/components/icons/PasquaIcon";
import { Settings, AlertTriangle, Lightbulb, Telescope, Zap, MoreHorizontal, Edit3, Trash2, PanelLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SidebarInset, useSidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatHistorySidebar } from "@/components/sidebar/ChatHistorySidebar";
import { useTheme } from "@/components/theme/theme-provider";
import { ThemeToggleItemContent } from "@/components/theme/theme-toggle-item-content";


const examplePrompts = [
  { title: "Brainstorm ideas", description: "for my new indie game", icon: Lightbulb },
  { title: "Explain a complex topic", description: "like quantum computing in simple terms", icon: Zap },
  { title: "Write a poem", description: "about the beauty of nature", icon: Edit3 },
  { title: "Summarize an article", description: "from a URL you provide (Note: URL fetching not yet implemented)", icon: Telescope },
];


export default function ChatPage() {
  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { isMobile, toggleSidebar, state: sidebarState } = useSidebar();
  const { theme, setTheme } = useTheme();


  const [chatSessions, setChatSessions] = React.useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = React.useState<ChatMessage[]>([]);
  const [isTemporaryChat, setIsTemporaryChat] = React.useState(false);

  const [editingChatSessionId, setEditingChatSessionId] = React.useState<string | null>(null);
  const [titleInputValue, setTitleInputValue] = React.useState('');
  const titleInputRef = React.useRef<HTMLInputElement>(null);


  React.useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_LOCAL_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setIsApiKeyDialogOpen(true); // Prompt for API key if not found
    }

    const storedSessions = localStorage.getItem(CHAT_SESSIONS_LOCAL_STORAGE_KEY);
    if (storedSessions) {
      try {
        const parsedSessions = JSON.parse(storedSessions) as ChatSession[];
        setChatSessions(parsedSessions);
        const lastNonTemporarySession = parsedSessions.filter(s => !s.isTemporary).sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt)[0];
        if (lastNonTemporarySession) {
          setActiveChatId(lastNonTemporarySession.id);
          setCurrentMessages(lastNonTemporarySession.messages.map(m => ({...m, isStreaming: false})));
          setIsTemporaryChat(lastNonTemporarySession.isTemporary || false);
        } else {
          handleNewChat(false);
        }
      } catch (error) {
        console.error("Failed to parse chat sessions from localStorage:", error);
        handleNewChat(false);
      }
    } else {
      handleNewChat(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const sessionsToSave = chatSessions.filter(s => !s.isTemporary);
    if (sessionsToSave.length > 0) {
      localStorage.setItem(CHAT_SESSIONS_LOCAL_STORAGE_KEY, JSON.stringify(sessionsToSave));
    } else {
      localStorage.removeItem(CHAT_SESSIONS_LOCAL_STORAGE_KEY);
    }
  }, [chatSessions]);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [currentMessages]);

  React.useEffect(() => {
    if (editingChatSessionId && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingChatSessionId]);


  const handleApiKeySave = (newApiKey: string) => {
    setApiKey(newApiKey);
    setIsApiKeyDialogOpen(false);
    toast({ title: "API Key Saved", description: "Your Gemini API key has been saved." });
  };

  const updateChatSessionMessages = (sessionId: string, updatedMessages: ChatMessage[], newTitle?: string) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: updatedMessages,
              title: newTitle
                     ? newTitle
                     : (session.title === "New Chat" && updatedMessages.length > 0 && typeof updatedMessages[0].text === 'string'
                        ? (updatedMessages[0].text as string).substring(0, 30) + ((updatedMessages[0].text as string).length > 30 ? '...' : '')
                        : session.title),
              lastUpdatedAt: Date.now(),
            }
          : session
      )
    );
  };


  const handleSendMessage = async (messageText: string, mediaPayload?: ChatMessageMedia) => {
    if (!apiKey) {
      toast({ title: "API Key Missing", description: "Please set your Gemini API key in settings.", variant: "destructive" });
      setIsApiKeyDialogOpen(true);
      return;
    }
    if (editingChatSessionId) {
      setEditingChatSessionId(null);
    }

    let currentActiveChatIdForRequest = activeChatId;
    let tempMessagesForRequestSetup = [...currentMessages];

    const currentActiveSessionDetails = activeChatId ? chatSessions.find(s => s.id === activeChatId) : null;
    const currentActiveChatIsPristineTemporary = currentActiveSessionDetails?.isTemporary && tempMessagesForRequestSetup.length === 0;

    if (!currentActiveChatIdForRequest || (isTemporaryChat && !currentActiveChatIsPristineTemporary)) {
        const newId = handleNewChat(false);
        currentActiveChatIdForRequest = newId;
        tempMessagesForRequestSetup = [];
         setCurrentMessages([]);
    } else if (isTemporaryChat && currentActiveChatIsPristineTemporary && currentActiveChatIdForRequest) {
        setChatSessions(prev => prev.map(s => s.id === currentActiveChatIdForRequest ? {...s, isTemporary: false, title: "New Chat", lastUpdatedAt: Date.now()} : s));
        setIsTemporaryChat(false);
    }

    const userMessage: ChatMessage = {
      id: uuidv4(),
      sender: "user",
      text: messageText,
      media: mediaPayload,
      timestamp: Date.now(),
    };

    let autoTitle = "";
    if (tempMessagesForRequestSetup.length === 0 && (!currentActiveSessionDetails || currentActiveSessionDetails.title === "New Chat")) {
        if (messageText) {
            autoTitle = messageText.substring(0, 30) + (messageText.length > 30 ? '...' : '');
        } else if (mediaPayload) {
            autoTitle = mediaPayload.name.substring(0, 30) + (mediaPayload.name.length > 30 ? '...' : '');
        }
    }

    const updatedMessagesWithUser = [...tempMessagesForRequestSetup, userMessage];
    setCurrentMessages(updatedMessagesWithUser);
    if (currentActiveChatIdForRequest) {
        setChatSessions(prevSessions =>
          prevSessions.map(session =>
            session.id === currentActiveChatIdForRequest
              ? {
                  ...session,
                  messages: updatedMessagesWithUser,
                  title: autoTitle ? autoTitle : session.title,
                  lastUpdatedAt: Date.now(),
                  isTemporary: (isTemporaryChat && currentActiveChatIsPristineTemporary) ? false : session.isTemporary,
                }
              : session
          )
        );
    }

    const aiPlaceholderMessageId = uuidv4();
    const aiPlaceholderMessage: ChatMessage = {
        id: aiPlaceholderMessageId,
        sender: "ai",
        text: "",
        isStreaming: true,
        timestamp: Date.now()
    };

    const updatedMessagesWithPlaceholder = [...updatedMessagesWithUser, aiPlaceholderMessage];
    setCurrentMessages(updatedMessagesWithPlaceholder);
    if (currentActiveChatIdForRequest) {
      updateChatSessionMessages(currentActiveChatIdForRequest, updatedMessagesWithPlaceholder, autoTitle || undefined);
    }

    setIsLoading(true);

    const historyForApi = updatedMessagesWithUser
      .filter(msg => msg.id !== aiPlaceholderMessageId) // Exclude the current AI placeholder
      .filter(msg => (typeof msg.text === 'string' && msg.text.trim() !== "") || msg.media)
      .map(msg => {
        const parts: any[] = [];
        if (typeof msg.text === 'string' && msg.text.trim()) {
          parts.push({ text: msg.text });
        }
        if (msg.media?.dataUri) {
          const base64Data = msg.media.dataUri.split(',')[1];
          if (base64Data) {
            parts.push({ inline_data: { mime_type: msg.media.type, data: base64Data } });
          }
        }
        return {
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: parts,
        };
      })
      .filter(content => content.parts.length > 0);


    // Construct the final contents array including the current user message
    const finalContentsForApi = [...historyForApi];
    // The userMessage parts are already included via updatedMessagesWithUser for historyForApi.
    // If historyForApi was based on tempMessagesForRequestSetup, we'd add userMessage parts here.
    // But since it's based on updatedMessagesWithUser, it's already there.

    const requestBody = {
      contents: finalContentsForApi,
      // TODO: Consider adding generationConfig and safetySettings if needed
    };

    let accumulatedResponse = "";
    let finalAiMessageText: string | React.ReactNode = "";

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error" } }));
        const apiErrorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
        console.error("API Error (non-ok response):", apiErrorMessage);
        finalAiMessageText = <div className="text-destructive"><AlertTriangle className="inline-block mr-2 h-4 w-4" />Error: {apiErrorMessage}</div>;
        toast({ title: "API Error", description: apiErrorMessage, variant: "destructive" });
      } else {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonString = line.substring(6);
                const chunkData = JSON.parse(jsonString);

                if (chunkData.error) {
                  console.error("Error in stream from API:", chunkData.error.message);
                  finalAiMessageText = <div className="text-destructive"><AlertTriangle className="inline-block mr-2 h-4 w-4" />Stream Error: {chunkData.error.message}</div>;
                  toast({ title: "Stream Error", description: chunkData.error.message, variant: "destructive" });
                  // Update UI with this error
                  setCurrentMessages(prevMsgs =>
                    prevMsgs.map(msg =>
                      msg.id === aiPlaceholderMessageId
                        ? { ...msg, text: finalAiMessageText, isStreaming: false }
                        : msg
                    )
                  );
                  setIsLoading(false);
                  return; // Stop processing on stream error
                }

                if (chunkData.candidates?.[0]?.content?.parts?.[0]?.text) {
                  accumulatedResponse += chunkData.candidates[0].content.parts[0].text;
                  finalAiMessageText = accumulatedResponse;
                  setCurrentMessages(prevMsgs =>
                    prevMsgs.map(msg =>
                      msg.id === aiPlaceholderMessageId
                        ? { ...msg, text: accumulatedResponse, isStreaming: true }
                        : msg
                    ));
                }
              } catch (e) {
                // This might happen if a non-JSON line is processed, or malformed JSON
                console.warn("Error parsing stream chunk or non-JSON line:", e, "Chunk:", line);
              }
            }
          }
        }
        // Process any remaining data in the buffer
        if (buffer.startsWith('data: ')) {
          try {
            const jsonString = buffer.substring(6);
            const chunkData = JSON.parse(jsonString);
             if (chunkData.candidates?.[0]?.content?.parts?.[0]?.text) {
                accumulatedResponse += chunkData.candidates[0].content.parts[0].text;
             }
          } catch (e) {
            console.warn("Error parsing final buffer chunk:", e, "Chunk:", buffer);
          }
        }
        finalAiMessageText = accumulatedResponse;
        if (typeof finalAiMessageText === 'string' && finalAiMessageText.trim() === "") {
          finalAiMessageText = "No text content in response.";
        }
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while processing stream.";
      finalAiMessageText = (
          <div className="text-destructive">
            <AlertTriangle className="inline-block mr-2 h-4 w-4" />
            Error: {errorMessage}
          </div>
      );
      toast({ title: "Stream Processing Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setCurrentMessages(prevMsgs => {
        const updated = prevMsgs.map(msg =>
          msg.id === aiPlaceholderMessageId
            ? { ...msg, text: finalAiMessageText, isStreaming: false }
            : msg
        );
        if(currentActiveChatIdForRequest) updateChatSessionMessages(currentActiveChatIdForRequest, updated);
        return updated;
      });
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
          if (viewport) viewport.scrollTop = viewport.scrollHeight;
        }
      }, 0);
    }
  };

  const handleNewChat = (temporary: boolean) => {
    if (isLoading) return "";
    if (editingChatSessionId) {
      setEditingChatSessionId(null);
    }

    const newChatId = uuidv4();
    const newChat: ChatSession = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      isTemporary: temporary,
    };
    setChatSessions(prev => [...prev, newChat]);
    setActiveChatId(newChatId);
    setCurrentMessages([]);
    setIsTemporaryChat(temporary);
    if (isMobile && sidebarState === 'expanded') toggleSidebar(); // Close sidebar on mobile if open
    return newChatId;
  };

  const handleSelectChat = (sessionId: string) => {
    if (isLoading || editingChatSessionId === sessionId) return;
    if (editingChatSessionId && editingChatSessionId !== sessionId) {
      setEditingChatSessionId(null);
    }

    const selectedChat = chatSessions.find(session => session.id === sessionId);
    if (selectedChat) {
      setActiveChatId(sessionId);
      setCurrentMessages(selectedChat.messages.map(m => ({...m, isStreaming: false })));
      setIsTemporaryChat(selectedChat.isTemporary || false);
      if (isMobile && sidebarState === 'expanded') toggleSidebar();
    }
  };

  const handleDeleteChat = (sessionId: string) => {
    if (isLoading) return;
     if (editingChatSessionId === sessionId) {
      setEditingChatSessionId(null);
    }

    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    if (activeChatId === sessionId) {
      const remainingSessions = chatSessions.filter(s => s.id !== sessionId && !s.isTemporary).sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt);
      if (remainingSessions.length > 0) {
        handleSelectChat(remainingSessions[0].id);
      } else {
        handleNewChat(false);
      }
    }
  };

  const handleTemporaryChatToggle = (checked: boolean) => {
    if (isLoading || editingChatSessionId) return;

    setIsTemporaryChat(checked);
    if (activeChatId) {
        const currentActiveChat = chatSessions.find(c => c.id === activeChatId);
        if(currentActiveChat && currentActiveChat.messages.length === 0) {
            setChatSessions(prev => prev.map(s => s.id === activeChatId ? {...s, isTemporary: checked, lastUpdatedAt: Date.now()} : s));
        } else if (checked) {
            handleNewChat(true);
        } else {
             setChatSessions(prev => prev.map(s => s.id === activeChatId ? {...s, isTemporary: false, lastUpdatedAt: Date.now()} : s));
        }
    } else {
        handleNewChat(checked);
    }
  };

  const startEditingTitle = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session && !session.isTemporary) {
      setEditingChatSessionId(sessionId);
      setTitleInputValue(session.title === "New Chat" && session.messages.length === 0 ? "" : session.title);
    } else if (session && session.isTemporary) {
        toast({ title: "Info", description: "Temporary chats cannot be renamed.", variant: "default" });
    }
  };

  const saveChatTitle = (sessionId: string) => {
    const trimmedTitle = titleInputValue.trim();
    if (!trimmedTitle) {
      toast({ title: "Error", description: "Chat title cannot be empty.", variant: "destructive" });
      const originalSession = chatSessions.find(s => s.id === sessionId);
      if (originalSession) setTitleInputValue(originalSession.title === "New Chat" && originalSession.messages.length === 0 ? "" : originalSession.title);
      return;
    }
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, title: trimmedTitle, lastUpdatedAt: Date.now() } : session
      )
    );
    setEditingChatSessionId(null);
  };

  const cancelEditTitle = () => {
    const session = chatSessions.find(s => s.id === editingChatSessionId);
    if (session) {
        setTitleInputValue(session.title);
    }
    setEditingChatSessionId(null);
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };


  const activeSession = chatSessions.find(s => s.id === activeChatId);
  const currentActualChatTitle = activeSession?.title || "New Chat";
  const currentChatTitleToDisplay =
    (currentActualChatTitle === "New Chat" && (!activeSession || activeSession.messages.length === 0))
    ? "Pasqua AI Chat"
    : currentActualChatTitle;
  const isCurrentlyEditingThisTitle = editingChatSessionId === activeChatId;


  return (
    <div className="flex h-screen w-full">
      <ChatHistorySidebar
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onNewChat={() => handleNewChat(isTemporaryChat)}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        isLoading={isLoading || isCurrentlyEditingThisTitle}
        className="hidden md:flex"
      />
      <SidebarInset>
        <div className="flex h-screen w-full flex-col items-center bg-background text-foreground">
          <header className="w-full flex justify-between items-center p-3 md:p-4 border-b border-border sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2 flex-grow min-w-0">
               <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden shrink-0" aria-label="Toggle History" disabled={isLoading || isCurrentlyEditingThisTitle}>
                <PanelLeft className="h-6 w-6 text-primary" />
              </Button>

              <div className="flex items-center gap-1 flex-grow min-w-0">
                {isCurrentlyEditingThisTitle && activeChatId ? (
                  <Input
                    ref={titleInputRef}
                    value={titleInputValue}
                    onChange={(e) => setTitleInputValue(e.target.value)}
                    placeholder="Chat Title"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveChatTitle(activeChatId);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEditTitle();
                      }
                    }}
                    onBlur={() => {
                          if (editingChatSessionId === activeChatId && titleInputValue.trim()) {
                             saveChatTitle(activeChatId);
                          } else if (editingChatSessionId === activeChatId) {
                            cancelEditTitle();
                          }
                    }}
                    className="text-lg font-semibold h-9 px-2 flex-grow bg-card border border-input focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                    disabled={isLoading}
                  />
                ) : (
                  <h2 className="text-lg font-semibold truncate px-1 py-1">
                    {currentChatTitleToDisplay}
                  </h2>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Switch
                  id="temporary-chat"
                  checked={isTemporaryChat}
                  onCheckedChange={handleTemporaryChatToggle}
                  aria-label="Temporary Chat Toggle"
                  disabled={isLoading || isCurrentlyEditingThisTitle}
                />
                <Label htmlFor="temporary-chat" className="text-sm hidden sm:inline">Temporary</Label>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isLoading || isCurrentlyEditingThisTitle}>
                    <MoreHorizontal className="h-5 w-5"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Chat Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {activeChatId && !isCurrentlyEditingThisTitle && activeSession && !activeSession.isTemporary && (
                    <DropdownMenuItem onClick={() => startEditingTitle(activeChatId)} disabled={isLoading}>
                      <Edit3 className="mr-2 h-4 w-4" /> Rename Chat
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleNewChat(false)} disabled={isLoading || isCurrentlyEditingThisTitle}>New Persistent Chat</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNewChat(true)} disabled={isLoading || isCurrentlyEditingThisTitle}>New Temporary Chat</DropdownMenuItem>
                   <DropdownMenuItem onClick={handleThemeToggle} disabled={isLoading || isCurrentlyEditingThisTitle}>
                    <ThemeToggleItemContent />
                  </DropdownMenuItem>
                  {activeChatId && chatSessions.find(s => s.id === activeChatId && !s.isTemporary && s.messages.length > 0 ) && (
                     <DropdownMenuItem
                        onClick={() => activeChatId && handleDeleteChat(activeChatId)}
                        className="text-destructive"
                        disabled={isLoading || isCurrentlyEditingThisTitle}>
                       <Trash2 className="mr-2 h-4 w-4" /> Delete Current Chat
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={() => setIsApiKeyDialogOpen(true)} aria-label="API Key Settings" className="h-9 w-9" disabled={isLoading || isCurrentlyEditingThisTitle}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <div className="flex-1 w-full max-w-3xl mx-auto overflow-hidden flex flex-col pt-2 pb-4 px-2 md:px-0">
            <ScrollArea className="flex-1 px-2 md:px-4" ref={scrollAreaRef}>
              {currentMessages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-8 md:pt-16">
                  <PasquaIcon className="h-16 w-16 text-primary mb-6" />
                  <h2 className="text-3xl font-semibold mb-8">What can I help with?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                    {examplePrompts.map((prompt) => (
                      <Button
                        key={prompt.title}
                        variant="outline"
                        className="h-auto p-4 text-left justify-start bg-card hover:bg-accent/50"
                        onClick={() => handleSendMessage(`${prompt.title} ${prompt.description}`)}
                        disabled={isLoading || !apiKey}
                      >
                        <prompt.icon className="h-5 w-5 mr-3 text-primary shrink-0" />
                        <div>
                          <p className="font-medium text-card-foreground">{prompt.title}</p>
                          <p className="text-sm text-muted-foreground">{prompt.description}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {currentMessages.map((msg) => (
                <ChatMessageComponent key={msg.id} {...msg} />
              ))}
            </ScrollArea>
            <div className="mt-auto px-2 md:px-0 pt-2">
                {!apiKey && (
                <Alert variant="destructive" className="w-full mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>API Key Required</AlertTitle>
                    <AlertDescription>
                    Please set your Gemini API key to enable chat functionality. You can set it using the <Settings className="inline-block h-4 w-4 mx-1" /> icon in the header.
                    </AlertDescription>
                </Alert>
                )}
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                disabled={isLoading || !apiKey || isCurrentlyEditingThisTitle}
              />
            </div>
          </div>
        </div>
      </SidebarInset>

      <ApiKeyDialog
        open={isApiKeyDialogOpen}
        onOpenChange={setIsApiKeyDialogOpen}
        onApiKeySave={handleApiKeySave}
      />
    </div>
  );
}

    