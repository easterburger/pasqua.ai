
"use client";

import * as React from "react";
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
import type { ChatMessage, ChatSession } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


// Define the structure for chat history parts as expected by Gemini API
interface GeminiContentPart {
  text: string;
}
interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
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


  // Load API Key and Chat Sessions from localStorage
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

  // Save chat sessions to localStorage whenever they change
  React.useEffect(() => {
    const sessionsToSave = chatSessions.filter(s => !s.isTemporary);
    if (sessionsToSave.length > 0) {
      localStorage.setItem(CHAT_SESSIONS_LOCAL_STORAGE_KEY, JSON.stringify(sessionsToSave));
    } else {
      // If no non-temporary sessions exist, remove the key from localStorage
      localStorage.removeItem(CHAT_SESSIONS_LOCAL_STORAGE_KEY);
    }
  }, [chatSessions]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [currentMessages]);

  const handleApiKeySave = (newApiKey: string) => {
    setApiKey(newApiKey);
    localStorage.setItem(API_KEY_LOCAL_STORAGE_KEY, newApiKey);
    setIsApiKeyDialogOpen(false);
  };

  const updateChatSession = (sessionId: string, updatedMessages: ChatMessage[]) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: updatedMessages,
              title: session.title === "New Chat" && updatedMessages.length > 0 && typeof updatedMessages[0].text === 'string'
                      ? (updatedMessages[0].text as string).substring(0, 30) + ((updatedMessages[0].text as string).length > 30 ? '...' : '')
                      : session.title,
              lastUpdatedAt: Date.now(),
              isTemporary: chatSessions.find(s => s.id === sessionId)?.isTemporary || isTemporaryChat, 
            }
          : session
      )
    );
  };


  const addMessageToCurrentChat = (sender: "user" | "ai", text: string | React.ReactNode, isStreaming = false) => {
    const newMessage: ChatMessage = { 
      id: uuidv4(), 
      sender, 
      text, 
      isStreaming,
      timestamp: Date.now() 
    };
    
    setCurrentMessages(prevMessages => {
      const newMessages = [...prevMessages, newMessage];
      if (activeChatId) {
        // Update session immediately with the new message list
        // This is particularly important for the AI placeholder
        updateChatSession(activeChatId, newMessages);
      }
      return newMessages;
    });
  };
  
  const updateLastMessageInCurrentChat = (text: string | React.ReactNode, isStreaming = false) => {
    setCurrentMessages(prevMessages => {
      const updatedMessages = prevMessages.map((msg, index) => 
        index === prevMessages.length - 1 
        ? { ...msg, text, isStreaming, timestamp: Date.now() } 
        : msg
      );
      if (activeChatId) {
        updateChatSession(activeChatId, updatedMessages);
      }
      return updatedMessages;
    });
  };

  const handleSendMessage = async (messageText: string) => {
    if (!apiKey) {
      toast({
        title: "API Key Missing",
        description: "Please set your Gemini API key to send messages.",
        variant: "destructive",
      });
      setIsApiKeyDialogOpen(true);
      return;
    }

    let currentActiveChatId = activeChatId;
    if (!currentActiveChatId) {
      currentActiveChatId = handleNewChat(isTemporaryChat); 
    }
    
    // Use a functional update for setCurrentMessages to ensure we're working with the latest state
    setCurrentMessages(prevMessages => {
        const userMessage: ChatMessage = {
          id: uuidv4(),
          sender: "user",
          text: messageText,
          timestamp: Date.now(),
        };
        const newMessages = [...prevMessages, userMessage];
        if (currentActiveChatId) {
            updateChatSession(currentActiveChatId, newMessages);
        }
        return newMessages;
    });


    // Add AI placeholder message using functional update as well
    setCurrentMessages(prevMessages => {
        const aiPlaceholderMessage: ChatMessage = {
            id: uuidv4(),
            sender: "ai",
            text: "",
            isStreaming: true,
            timestamp: Date.now()
        };
        const messagesWithPlaceholder = [...prevMessages, aiPlaceholderMessage];
        if (currentActiveChatId) {
            updateChatSession(currentActiveChatId, messagesWithPlaceholder);
        }
        return messagesWithPlaceholder;
    });

    setIsLoading(true);

    // Construct history from the state *before* adding the AI placeholder, but *with* the user message.
    // The `currentMessages` state at this point (after the two setCurrentMessages calls above have batched and run)
    // will contain the user message and the AI placeholder. We need history *before* the placeholder.
    const historyForApi = currentMessages // This now includes the user message from the first setCurrentMessages
      .filter(msg => !(msg.sender === 'ai' && msg.isStreaming && msg.text === "")) // ensure no prior placeholders
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: typeof msg.text === 'string' ? msg.text : String(msg.text) }], 
      }));
    // If the last message in `historyForApi` is the AI placeholder (it shouldn't be, due to filter, but as a safeguard)
    // we'll remove it. More accurately, `historyForApi` should be built from messages *before* the placeholder.
    // Let's rebuild history correctly based on `currentMessages` up to the user message.
    const messagesUpToUser = currentMessages.slice(0, -1); // Excludes the AI placeholder

    const geminiHistory: GeminiContent[] = messagesUpToUser
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: typeof msg.text === 'string' ? msg.text : String(msg.text) }],
      }));
    
    let accumulatedResponse = "";

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}&alt=sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: geminiHistory }),
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
                  } else if (parsed.error) { /* Error handling in stream done below */ }
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
                    updateLastMessageInCurrentChat(accumulatedResponse, true);
                 }
              } else if (parsed.error) {
                console.error("API error in stream:", parsed.error.message);
                updateLastMessageInCurrentChat(
                  <div className="text-destructive">
                    <AlertTriangle className="inline-block mr-2 h-4 w-4" />
                    Error from API: {parsed.error.message}
                  </div>, false
                );
                setIsLoading(false); // Ensure loading stops
                if (currentActiveChatId) {
                    setCurrentMessages(prev => {
                        const finalMsgs = prev.map(m => m.id === prev[prev.length-1].id ? {...m, isStreaming: false} : m );
                        updateChatSession(currentActiveChatId, finalMsgs);
                        return finalMsgs;
                    });
                }
                return; 
              }
            } catch (e) { console.warn("Error parsing streaming JSON chunk:", e, "Line:", line); }
          }
        }
      }

      if (accumulatedResponse) {
        updateLastMessageInCurrentChat(accumulatedResponse, false);
      } else {
        // Ensure placeholder is removed or updated if no text response
        setCurrentMessages(prev => {
            const lastMsg = prev[prev.length-1];
            if (lastMsg?.sender === 'ai' && lastMsg?.isStreaming && lastMsg?.text === "") {
                const updated = prev.map((msg, index) => index === prev.length-1 ? {...msg, text: "No text content in response.", isStreaming: false} : msg);
                if (currentActiveChatId) updateChatSession(currentActiveChatId, updated);
                return updated;
            }
            return prev;
        });
      }

    } catch (error) {
      console.error("Error calling Gemini API:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      updateLastMessageInCurrentChat(
        <div className="text-destructive">
          <AlertTriangle className="inline-block mr-2 h-4 w-4" />
          Error: {errorMessage}
        </div>, false
      );
      toast({ title: "API Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
      // Final update to session after streaming finishes or errors, ensuring isStreaming is false
      if (currentActiveChatId) {
        setCurrentMessages(prev => {
            const finalMessages = prev.map(m => ({...m, isStreaming: false}));
            updateChatSession(currentActiveChatId, finalMessages);
            return finalMessages;
        });
      }
    }
  };

  const handleNewChat = (temporary: boolean) => {
    if (isLoading) return ""; // Prevent new chat creation while loading

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
    if (isLoading) return; // Prevent chat selection while loading

    const selectedChat = chatSessions.find(session => session.id === sessionId);
    if (selectedChat) {
      setActiveChatId(sessionId);
      setCurrentMessages(selectedChat.messages);
      setIsTemporaryChat(selectedChat.isTemporary || false);
      if (isMobile) toggleSidebar();
    }
  };

  const handleDeleteChat = (sessionId: string) => {
    if (isLoading) return; // Prevent chat deletion while loading

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
    if (isLoading) return; // Prevent toggle while loading

    setIsTemporaryChat(checked);
    if (activeChatId) {
        const currentActiveChat = chatSessions.find(c => c.id === activeChatId);
        if(currentActiveChat && currentActiveChat.messages.length === 0) { 
            setChatSessions(prev => prev.map(s => s.id === activeChatId ? {...s, isTemporary: checked} : s));
        } else if (checked) { 
            handleNewChat(true);
        } else { 
             setChatSessions(prev => prev.map(s => s.id === activeChatId ? {...s, isTemporary: false, lastUpdatedAt: Date.now()} : s));
        }
    } else { 
        handleNewChat(checked);
    }
  };

  const currentChatTitle = chatSessions.find(s => s.id === activeChatId)?.title || "Pasqua AI Chat";

  return (
    <div className="flex h-screen w-full">
      <ChatHistorySidebar
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onNewChat={() => handleNewChat(isTemporaryChat)} 
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        isLoading={isLoading} // Pass isLoading
        className="hidden md:flex" 
      />
      <SidebarInset>
        <div className="flex h-screen flex-col items-center bg-background text-foreground">
          <header className="w-full flex justify-between items-center p-3 md:p-4 border-b border-border sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden" aria-label="Toggle History" disabled={isLoading}>
                <PasquaIcon className="h-6 w-6 text-primary" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-lg font-semibold px-2" disabled={isLoading}>
                    {currentChatTitle === "New Chat" ? "Pasqua AI Chat" : currentChatTitle}
                    <MoreHorizontal className="h-4 w-4 ml-1 opacity-50"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Chat Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNewChat(false)} disabled={isLoading}>New Persistent Chat</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNewChat(true)} disabled={isLoading}>New Temporary Chat</DropdownMenuItem>
                  {activeChatId && chatSessions.find(s => s.id === activeChatId)?.messages.length > 0 && (
                     <DropdownMenuItem 
                        onClick={() => activeChatId && handleDeleteChat(activeChatId)} 
                        className="text-destructive"
                        disabled={isLoading}>
                       <Trash2 className="mr-2 h-4 w-4" /> Delete Current Chat
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="temporary-chat"
                  checked={isTemporaryChat}
                  onCheckedChange={handleTemporaryChatToggle}
                  aria-label="Temporary Chat Toggle"
                  disabled={isLoading}
                />
                <Label htmlFor="temporary-chat" className="text-sm hidden sm:inline">Temporary</Label>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsApiKeyDialogOpen(true)} aria-label="API Key Settings" disabled={isLoading}>
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
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={!apiKey || isLoading} />
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

