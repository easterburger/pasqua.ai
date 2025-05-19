
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage, type ChatMessageProps } from "@/components/chat/ChatMessage";
import { ApiKeyDialog } from "@/components/chat/ApiKeyDialog";
import { API_KEY_LOCAL_STORAGE_KEY } from "@/lib/constants";
import { PasquaIcon } from "@/components/icons/PasquaIcon";
import { Settings, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the structure for chat history parts as expected by Gemini API
interface GeminiContentPart {
  text: string;
}
interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}

export default function ChatPage() {
  const [messages, setMessages] = React.useState<ChatMessageProps[]>([]);
  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_LOCAL_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setIsApiKeyDialogOpen(true); // Prompt for API key if not found
    }
  }, []);
  
  React.useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);


  const handleApiKeySave = (newApiKey: string) => {
    setApiKey(newApiKey);
  };

  const addMessage = (sender: "user" | "ai", text: string | React.ReactNode, isStreaming = false) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: Date.now().toString() + Math.random(), sender, text, isStreaming },
    ]);
  };
  
  const updateLastMessage = (text: string | React.ReactNode, isStreaming = false) => {
    setMessages(prevMessages => {
      const newMessages = [...prevMessages];
      if (newMessages.length > 0) {
        newMessages[newMessages.length -1].text = text;
        newMessages[newMessages.length -1].isStreaming = isStreaming;
      }
      return newMessages;
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

    addMessage("user", messageText);
    setIsLoading(true);
    addMessage("ai", "", true); // Add a placeholder for AI response while streaming

    // Prepare history for Gemini API
    // Exclude the current AI placeholder from history sent to API
    const history: GeminiContent[] = messages
      .filter(msg => !(msg.sender === 'ai' && msg.isStreaming && msg.text === "")) 
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: typeof msg.text === 'string' ? msg.text : String(msg.text) }],
      }));
    
    // Add current user message to history for the API call
    const currentCallHistory = [...history, { role: 'user' as const, parts: [{ text: messageText }] }];

    let accumulatedResponse = "";

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}&alt=sse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents: currentCallHistory }),
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
          // Process any remaining data in the buffer
          if (buffer.trim()) {
            const lastLine = buffer.trim();
            if (lastLine.startsWith("data: ")) {
              try {
                const jsonStr = lastLine.substring(6);
                if (jsonStr) {
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.candidates && parsed.candidates[0].content && parsed.candidates[0].content.parts) {
                    const textPart = parsed.candidates[0].content.parts[0].text;
                    if (textPart) accumulatedResponse += textPart;
                  } else if (parsed.error) {
                    console.error("API error in final stream chunk:", parsed.error.message);
                    updateLastMessage(
                      <div className="text-destructive">
                        <AlertTriangle className="inline-block mr-2 h-4 w-4" />
                        Error from API: {parsed.error.message}
                      </div>, false
                    );
                    setIsLoading(false);
                    return;
                  }
                }
              } catch (e) {
                console.warn("Error parsing final buffered JSON chunk:", e, "Buffer:", lastLine);
              }
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

              if (parsed.candidates && parsed.candidates[0].content && parsed.candidates[0].content.parts) {
                 const textPart = parsed.candidates[0].content.parts[0].text;
                 if (textPart) {
                    accumulatedResponse += textPart;
                    updateLastMessage(accumulatedResponse, true);
                 }
              } else if (parsed.error) {
                console.error("API error in stream:", parsed.error.message);
                updateLastMessage(
                  <div className="text-destructive">
                    <AlertTriangle className="inline-block mr-2 h-4 w-4" />
                    Error from API: {parsed.error.message}
                  </div>, false
                );
                setIsLoading(false);
                return; 
              }
            } catch (e) {
              console.warn("Error parsing streaming JSON chunk:", e, "Line:", line);
            }
          }
        }
      }

      if (accumulatedResponse) {
        updateLastMessage(accumulatedResponse, false);
      } else {
        // If loop finished, no stream error, but no text.
        const lastMessage = messages.length > 0 ? messages[messages.length -1] : null;
        // Check if the AI placeholder is still the last message and empty.
        if (lastMessage && lastMessage.sender === 'ai' && lastMessage.isStreaming && typeof lastMessage.text === 'string' && lastMessage.text === "") {
            updateLastMessage("No text content in response.", false);
        }
        // If an error updated the message, this won't overwrite it.
      }

    } catch (error) {
      console.error("Error calling Gemini API:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      // Check if the last message is still the AI placeholder before overwriting
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      if (lastMessage && lastMessage.sender === 'ai' && lastMessage.isStreaming && typeof lastMessage.text === 'string' && lastMessage.text === "") {
        updateLastMessage(
          <div className="text-destructive">
            <AlertTriangle className="inline-block mr-2 h-4 w-4" />
            Error: {errorMessage}
          </div>, false
        );
      }
      toast({
        title: "API Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col items-center bg-background text-foreground p-4 md:p-6">
      <header className="w-full max-w-5xl flex justify-between items-center mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <PasquaIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold">Pasqua AI Chat</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsApiKeyDialogOpen(true)} aria-label="API Key Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex-1 w-full max-w-5xl overflow-hidden flex flex-col rounded-lg border border-border shadow-lg bg-card">
        <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollAreaRef}>
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
               <Info className="h-12 w-12 mb-4" />
              <p className="text-lg">Welcome to Pasqua AI Chat!</p>
              {!apiKey && <p>Please set your Gemini API key to start chatting.</p>}
              {apiKey && <p>Type a message below to begin.</p>}
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} {...msg} />
          ))}
        </ScrollArea>
        <div className="p-3 md:p-4 border-t border-border bg-card">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={!apiKey} />
        </div>
      </div>
      
      {!apiKey && (
        <Alert variant="destructive" className="w-full max-w-5xl mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API Key Required</AlertTitle>
          <AlertDescription>
            Please set your Gemini API Key using the settings icon <Settings className="inline-block h-4 w-4 mx-1" /> to use the chat.
          </AlertDescription>
        </Alert>
      )}

      <ApiKeyDialog
        open={isApiKeyDialogOpen}
        onOpenChange={setIsApiKeyDialogOpen}
        onApiKeySave={handleApiKeySave}
      />
    </div>
  );
}

    