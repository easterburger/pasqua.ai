
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
import { Settings, AlertTriangle, Lightbulb, Telescope, Zap, MoreHorizontal, Edit3, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { ChatHistorySidebar } from "@/components/sidebar/ChatHistorySidebar";

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // Base64 encoded string
  };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

const examplePrompts = [
  { title: "Brainstorm ideas", description: "for my new indie game", icon: Lightbulb },
  { title: "Explain a complex topic", description: "like quantum computing in simple terms", icon: Zap },
  { title: "Write a poem", description: "about the beauty of nature", icon: Edit3 },
  { title: "Summarize this article", description: "and give me the key takeaways", icon: Telescope },
];


export default function ChatPage() {
  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { isMobile, toggleSidebar } = useSidebar();

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
      setIsApiKeyDialogOpen(true);
    }

    const storedSessions = localStorage.getItem(CHAT_SESSIONS_LOCAL_STORAGE_KEY);
    if (storedSessions) {
      try {
        const parsedSessions = JSON.parse(storedSessions) as ChatSession[];
        setChatSessions(parsedSessions);
        const lastNonTemporarySession = parsedSessions.filter(s => !s.isTemporary).sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt)[0];
        if (lastNonTemporarySession) {
          setActiveChatId(lastNonTemporarySession.id);
          setCurrentMessages(lastNonTemporarySession.messages);
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
      // If there are no non-temporary sessions, remove the key from localStorage
      // This handles the case where all chats are deleted or the last one becomes temporary
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
    localStorage.setItem(API_KEY_LOCAL_STORAGE_KEY, newApiKey);
    setIsApiKeyDialogOpen(false);
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
      toast({
        title: "API Key Missing",
        description: "Please set your Gemini API key to send messages.",
        variant: "destructive",
      });
      setIsApiKeyDialogOpen(true);
      return;
    }
    if (editingChatSessionId) {
      setEditingChatSessionId(null); 
    }

    let currentActiveChatId = activeChatId;
    let tempMessages = [...currentMessages]; 

    const currentActiveSessionDetails = activeChatId ? chatSessions.find(s => s.id === activeChatId) : null;
    const currentActiveChatIsPristineTemporary = currentActiveSessionDetails?.isTemporary && currentMessages.length === 0;

    if (!currentActiveChatId || (isTemporaryChat && !currentActiveChatIsPristineTemporary)) {
        const newId = handleNewChat(false); 
        currentActiveChatId = newId;
        tempMessages = []; 
    } else if (isTemporaryChat && currentActiveChatIsPristineTemporary && currentActiveChatId) {
        setChatSessions(prev => prev.map(s => s.id === currentActiveChatId ? {...s, isTemporary: false, title: "New Chat", lastUpdatedAt: Date.now()} : s));
        setIsTemporaryChat(false); 
    }

    const userMessageParts: GeminiPart[] = [];
    if (messageText) {
      userMessageParts.push({ text: messageText });
    }
    if (mediaPayload) {
      userMessageParts.push({
        inlineData: {
          mimeType: mediaPayload.type,
          data: mediaPayload.dataUri.split(',')[1], // Extract base64 data
        },
      });
    }
    
    const userMessage: ChatMessage = {
      id: uuidv4(),
      sender: "user",
      text: messageText,
      media: mediaPayload,
      timestamp: Date.now(),
    };
    
    // Derive title from first message (text or media name)
    let autoTitle = "";
    if (currentMessages.length === 0 && (!currentActiveSessionDetails || currentActiveSessionDetails.title === "New Chat")) {
        if (messageText) {
            autoTitle = messageText.substring(0, 30) + (messageText.length > 30 ? '...' : '');
        } else if (mediaPayload) {
            autoTitle = mediaPayload.name.substring(0, 30) + (mediaPayload.name.length > 30 ? '...' : '');
        }
    }
    
    tempMessages = [...tempMessages, userMessage];
    setCurrentMessages(tempMessages); 

    if (currentActiveChatId) {
        updateChatSessionMessages(currentActiveChatId, tempMessages, autoTitle || undefined);
    }
    
    const aiPlaceholderMessage: ChatMessage = {
        id: uuidv4(),
        sender: "ai",
        text: "",
        isStreaming: true,
        timestamp: Date.now()
    };
    
    tempMessages = [...tempMessages, aiPlaceholderMessage];
    setCurrentMessages(tempMessages);

    if (currentActiveChatId) {
        updateChatSessionMessages(currentActiveChatId, tempMessages, autoTitle || undefined);
    }

    setIsLoading(true);

    const historyToSend: GeminiContent[] = tempMessages
        .slice(0, -1) 
        .map(msg => {
            const parts: GeminiPart[] = [];
            if (typeof msg.text === 'string' && msg.text) {
                parts.push({ text: msg.text });
            }
            if (msg.media) {
                parts.push({
                    inlineData: {
                        mimeType: msg.media.type,
                        data: msg.media.dataUri.split(',')[1],
                    },
                });
            }
            return {
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: parts,
            };
        })
        .filter(content => content.parts.length > 0); // Ensure we don't send empty parts array

    let accumulatedResponse = "";

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}&alt=sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: historyToSend }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error" } }));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            const lastLine = buffer.trim();
            if (lastLine.startsWith("data: ")) {
              try {
                const jsonStr = lastLine.substring(6);
                if (jsonStr) {
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                    accumulatedResponse += parsed.candidates[0].content.parts[0].text;
                  } 
                }
              } catch (e) { console.warn("Error parsing final JSON chunk:", e, "Buffer:", lastLine); }
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let eolIndex;
        while ((eolIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.substring(0, eolIndex).trim();
          buffer = buffer.substring(eolIndex + 1);

          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.substring(6);
              if (jsonStr.trim() === "") continue;
              const parsed = JSON.parse(jsonStr);

              if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                 const textPart = parsed.candidates[0].content.parts[0].text;
                 if (textPart) {
                    accumulatedResponse += textPart;
                    setCurrentMessages(prevMsgs => {
                        const updated = prevMsgs.map((msg, index) =>
                            index === prevMsgs.length - 1 
                            ? { ...msg, text: accumulatedResponse, isStreaming: true } 
                            : msg
                        );
                        return updated;
                    });
                 }
              } else if (parsed.error) {
                console.error("API error in stream:", parsed.error.message);
                const errorText = (
                    <div className="text-destructive">
                        <AlertTriangle className="inline-block mr-2 h-4 w-4" />
                        Error from API: {parsed.error.message}
                    </div>
                );
                setCurrentMessages(prevMsgs => {
                    const updated = prevMsgs.map((msg, index) =>
                        index === prevMsgs.length - 1
                        ? { ...msg, text: errorText, isStreaming: false }
                        : msg
                    );
                    if(currentActiveChatId) updateChatSessionMessages(currentActiveChatId, updated.map(m => ({...m, isStreaming: false})));
                    return updated;
                });
                setIsLoading(false);
                return;
              }
            } catch (e) { console.warn("Error parsing streaming JSON chunk:", e, "Line:", line); }
          }
        }
      }
      
      setCurrentMessages(prevMsgs => {
        const finalResponse = accumulatedResponse || "No text content in response.";
        const updated = prevMsgs.map((msg, index) =>
            index === prevMsgs.length - 1
            ? { ...msg, text: finalResponse, isStreaming: false }
            : msg
        );
        if(currentActiveChatId) updateChatSessionMessages(currentActiveChatId, updated);
        return updated;
      });

    } catch (error) {
      console.error("Error calling Gemini API:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      const errorText = (
          <div className="text-destructive">
            <AlertTriangle className="inline-block mr-2 h-4 w-4" />
            Error: {errorMessage}
          </div>
      );
      setCurrentMessages(prevMsgs => {
        const updated = prevMsgs.map((msg, index) =>
            index === prevMsgs.length - 1
            ? { ...msg, text: errorText, isStreaming: false }
            : msg
        );
        if(currentActiveChatId) updateChatSessionMessages(currentActiveChatId, updated);
        return updated;
      });
      toast({ title: "API Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
      if (currentActiveChatId) {
        setCurrentMessages(prev => {
            const finalMessages = prev.map(m => ({...m, isStreaming: false}));
            updateChatSessionMessages(currentActiveChatId, finalMessages);
            return finalMessages;
        });
      }
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
    if (isMobile) toggleSidebar();
    return newChatId;
  };

  const handleSelectChat = (sessionId: string) => {
    if (isLoading) return;
    if (editingChatSessionId && editingChatSessionId !== sessionId) { 
      setEditingChatSessionId(null);
    }

    const selectedChat = chatSessions.find(session => session.id === sessionId);
    if (selectedChat) {
      setActiveChatId(sessionId);
      setCurrentMessages(selectedChat.messages);
      setIsTemporaryChat(selectedChat.isTemporary || false);
      if (isMobile) toggleSidebar();
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
            // If current chat is empty, just toggle its temporary status
            setChatSessions(prev => prev.map(s => s.id === activeChatId ? {...s, isTemporary: checked, lastUpdatedAt: Date.now()} : s));
        } else if (checked) {
            // If current chat has messages and user wants temporary, create a new temporary chat
            handleNewChat(true);
        } else {
            // If user wants persistent, make current chat persistent (if it was temporary)
             setChatSessions(prev => prev.map(s => s.id === activeChatId ? {...s, isTemporary: false, lastUpdatedAt: Date.now()} : s));
        }
    } else {
        // No active chat, create a new one with the specified temporary status
        handleNewChat(checked);
    }
  };

  const startEditingTitle = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setEditingChatSessionId(sessionId);
      setTitleInputValue(session.title === "New Chat" && session.messages.length === 0 ? "" : session.title);
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
        onNewChat={() => handleNewChat(isTemporaryChat)} // Pass current temp mode
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        isLoading={isLoading || isCurrentlyEditingThisTitle}
        className="hidden md:flex"
      />
      <SidebarInset>
        <div className="flex h-screen flex-col items-center bg-background text-foreground">
          <header className="w-full flex justify-between items-center p-3 md:p-4 border-b border-border sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2 flex-grow min-w-0">
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden shrink-0" aria-label="Toggle History" disabled={isLoading || isCurrentlyEditingThisTitle}>
                <PasquaIcon className="h-6 w-6 text-primary" />
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
                          if (editingChatSessionId === activeChatId) {
                             saveChatTitle(activeChatId);
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
                  {activeChatId && chatSessions.find(s => s.id === activeChatId && !s.isTemporary)?.messages.length > 0 && ( 
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
                        disabled={!apiKey || isLoading}
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
                    Please set your Gemini API Key using the settings icon <Settings className="inline-block h-4 w-4 mx-1" /> to use the chat.
                    </AlertDescription>
                </Alert>
                )}
              <ChatInput 
                onSendMessage={handleSendMessage} 
                isLoading={isLoading} 
                disabled={!apiKey || isLoading || isCurrentlyEditingThisTitle} 
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
