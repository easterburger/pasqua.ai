
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Mic, FileText, XCircle, Podcast } from "lucide-react";
import { generatePodcastScript } from "@/ai/flows/generate-podcast-script-flow";
import { useToast } from "@/hooks/use-toast";
import { PasquaIcon } from "@/components/icons/PasquaIcon";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const MAX_PDF_SIZE_MB = 10; // Consistent with flashcards
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

export default function PodcastPage() {
  const [customTopic, setCustomTopic] = React.useState("");
  const [selectedPdf, setSelectedPdf] = React.useState<{ name: string; dataUri: string } | null>(null);
  const [podcastTitle, setPodcastTitle] = React.useState<string | null>(null);
  const [podcastScript, setPodcastScript] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const pdfInputRef = React.useRef<HTMLInputElement>(null);

  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid File Type", description: "Please select a PDF file.", variant: "destructive" });
        if (pdfInputRef.current) pdfInputRef.current.value = "";
        setSelectedPdf(null);
        return;
      }
      if (file.size > MAX_PDF_SIZE_BYTES) {
        toast({ title: "File Too Large", description: `Please select a PDF smaller than ${MAX_PDF_SIZE_MB}MB.`, variant: "destructive" });
        if (pdfInputRef.current) pdfInputRef.current.value = "";
        setSelectedPdf(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedPdf({
          name: file.name,
          dataUri: e.target?.result as string,
        });
      };
      reader.onerror = (e) => {
        console.error("FileReader error:", e);
        toast({ title: "File Read Error", description: "Could not read the selected PDF.", variant: "destructive" });
        setSelectedPdf(null);
      }
      reader.readAsDataURL(file);
    } else {
      setSelectedPdf(null);
    }
  };

  const removeSelectedPdf = () => {
    setSelectedPdf(null);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  };

  const handleGenerateScript = async () => {
    if (!selectedPdf) {
      setError("Please upload a PDF document.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setPodcastScript(null);
    setPodcastTitle(null);

    try {
      const input: Parameters<typeof generatePodcastScript>[0] = { 
        pdfDataUri: selectedPdf.dataUri 
      };
      if (customTopic.trim()) {
        input.customTopic = customTopic.trim();
      }
      
      const result = await generatePodcastScript(input);
      if (result.podcastScript && result.suggestedTitle) {
        setPodcastTitle(result.suggestedTitle);
        setPodcastScript(result.podcastScript);
        if(result.suggestedTitle.toLowerCase().includes("error") || result.podcastScript.toLowerCase().includes("error")) {
            setError("The AI couldn't generate a script for this PDF. Please try a different one or check the console.");
            toast({
                title: "Script Generation Issue",
                description: "The AI had trouble generating a script from this PDF.",
                variant: "destructive",
            });
        }
      } else {
        setError("No podcast script was generated. Try being more specific or check the console for details.");
         toast({
          title: "No Script Generated",
          description: "The AI couldn't generate a podcast script for this PDF. Please try a different one.",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Error generating podcast script:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to generate podcast script: ${errorMessage}`);
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
      <header className="w-full max-w-4xl mb-8 flex items-center justify-between">
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
            <Mic className="mr-3 h-8 w-8" /> Podcast Script Generator
          </h1>
        </div>
      </header>

      <div className="w-full max-w-xl bg-card p-6 rounded-lg shadow-lg mb-8">
        <div className="space-y-4">
          <div>
            <Label htmlFor="pdf-upload" className="text-lg font-medium">
              Upload PDF Document
            </Label>
            <Input
              id="pdf-upload"
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePdfChange}
              className="mt-1 text-base file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              disabled={isLoading}
            />
            {selectedPdf && (
              <div className="mt-2 flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="truncate text-foreground" title={selectedPdf.name}>{selectedPdf.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={removeSelectedPdf}
                  disabled={isLoading}
                  aria-label="Remove selected PDF"
                >
                  <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            )}
          </div>
           <div>
            <Label htmlFor="customTopic" className="text-lg font-medium">
              Podcast Topic/Title Hint (Optional)
            </Label>
            <Input
              id="customTopic"
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="e.g., The Future of Renewable Energy, A History of Jazz"
              className="mt-1 text-base"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleGenerateScript}
            disabled={isLoading || !selectedPdf}
            className="w-full text-lg py-3"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Script...
              </>
            ) : (
              "Generate Podcast Script"
            )}
          </Button>
        </div>
         <p className="mt-4 text-xs text-center text-muted-foreground">
            Note: This tool generates a podcast script. Audio generation requires a separate Text-to-Speech tool.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="w-full max-w-2xl mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {podcastScript && podcastTitle && (
        <Card className="w-full max-w-4xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
                <Podcast className="mr-2 h-6 w-6" /> {podcastTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] p-1 border rounded-md bg-muted/30">
                <pre className="text-sm whitespace-pre-wrap p-4 font-sans leading-relaxed">
                    {podcastScript}
                </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
       {!podcastScript && !isLoading && !error && (
        <div className="text-center text-muted-foreground mt-8">
          <Mic className="mx-auto h-16 w-16 mb-4 opacity-50" />
          <p>Upload a PDF and optionally provide a topic to generate your podcast script.</p>
        </div>
      )}
    </div>
  );
}

