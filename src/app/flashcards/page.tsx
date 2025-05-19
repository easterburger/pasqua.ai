
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Layers } from "lucide-react";
import { generateFlashcards, Flashcard } from "@/ai/flows/generate-flashcards-flow";
import { FlashcardItem } from "@/components/flashcards/FlashcardItem";
import { useToast } from "@/hooks/use-toast";
import { PasquaIcon } from "@/components/icons/PasquaIcon";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


export default function FlashcardsPage() {
  const [topic, setTopic] = React.useState("");
  const [count, setCount] = React.useState<number>(5);
  const [flashcards, setFlashcards] = React.useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateFlashcards = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setFlashcards([]);

    try {
      const result = await generateFlashcards({ topic, count });
      if (result.flashcards && result.flashcards.length > 0) {
        setFlashcards(result.flashcards);
      } else {
        setError("No flashcards were generated for this topic. Try being more specific or check the console for details.");
         toast({
          title: "No Flashcards",
          description: "The AI couldn't generate flashcards for this topic. Please try a different or more specific topic.",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Error generating flashcards:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to generate flashcards: ${errorMessage}`);
      toast({
        title: "Generation Failed",
        description: `An error occurred: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="w-full max-w-3xl mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Link href="/" passHref>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-primary">
                                <PasquaIcon className="h-8 w-8" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>Back to Chat</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </Link>
          <h1 className="text-3xl font-semibold text-primary flex items-center">
            <Layers className="mr-3 h-8 w-8" /> Flashcard Generator
          </h1>
        </div>
      </header>

      <div className="w-full max-w-xl bg-card p-6 rounded-lg shadow-lg mb-8">
        <div className="space-y-4">
          <div>
            <Label htmlFor="topic" className="text-lg font-medium">
              Topic
            </Label>
            <Input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Photosynthesis, World War II, JavaScript Basics"
              className="mt-1 text-base"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="count" className="text-lg font-medium">
              Number of Flashcards (max 10)
            </Label>
            <Input
              id="count"
              type="number"
              value={count}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val > 0 && val <= 10) {
                    setCount(val);
                } else if (e.target.value === "") {
                    setCount(5); // Default or handle empty input
                } else if (val > 10) {
                    setCount(10);
                } else {
                    setCount(1);
                }
              }}
              min="1"
              max="10"
              className="mt-1 text-base"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleGenerateFlashcards}
            disabled={isLoading || !topic.trim()}
            className="w-full text-lg py-3"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Flashcards"
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="w-full max-w-xl mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {flashcards.length > 0 && (
        <div className="w-full max-w-3xl">
          <h2 className="text-2xl font-semibold mb-6 text-center">Generated Flashcards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flashcards.map((flashcard, index) => (
              <FlashcardItem key={index} front={flashcard.front} back={flashcard.back} />
            ))}
          </div>
        </div>
      )}
       {flashcards.length === 0 && !isLoading && !error && (
        <div className="text-center text-muted-foreground mt-8">
          <Layers className="mx-auto h-16 w-16 mb-4 opacity-50" />
          <p>Enter a topic above to generate your flashcards.</p>
        </div>
      )}
    </div>
  );
}
