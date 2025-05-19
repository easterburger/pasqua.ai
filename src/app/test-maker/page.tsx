
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, FileQuestion, FileText, XCircle, CheckSquare } from "lucide-react";
import { generateTest, TestQuestion } from "@/ai/flows/generate-test-flow";
import { QuestionDisplay } from "@/components/test-maker/QuestionDisplay";
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

const MAX_PDF_SIZE_MB = 10;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

export default function TestMakerPage() {
  const [topic, setTopic] = React.useState("");
  const [questionCount, setQuestionCount] = React.useState<number>(5);
  const [selectedPdf, setSelectedPdf] = React.useState<{ name: string; dataUri: string } | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = React.useState<TestQuestion[]>([]);
  const [testTitle, setTestTitle] = React.useState<string | null>(null);
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
        setSelectedPdf({ name: file.name, dataUri: e.target?.result as string });
      };
      reader.onerror = (e) => {
        console.error("FileReader error:", e);
        toast({ title: "File Read Error", description: "Could not read the selected PDF.", variant: "destructive" });
        setSelectedPdf(null);
      };
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

  const handleGenerateTest = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setGeneratedQuestions([]);
    setTestTitle(null);

    try {
      const input: Parameters<typeof generateTest>[0] = { topic, questionCount };
      if (selectedPdf) {
        input.pdfDataUri = selectedPdf.dataUri;
      }
      const result = await generateTest(input);
      if (result.questions && result.questions.length > 0) {
        setGeneratedQuestions(result.questions);
        setTestTitle(result.title || "Generated Test");
      } else {
        setError("No questions were generated. Try being more specific or check the console for details.");
        toast({
          title: "No Questions Generated",
          description: "The AI couldn't generate questions for this topic/PDF. Please try a different one.",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Error generating test:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to generate test: ${errorMessage}`);
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
            <FileQuestion className="mr-3 h-8 w-8" /> Test Maker
          </h1>
        </div>
      </header>

      <div className="w-full max-w-xl bg-card p-6 rounded-lg shadow-lg mb-8">
        <div className="space-y-4">
          <div>
            <Label htmlFor="topic" className="text-lg font-medium">
              Topic for the Test
            </Label>
            <Input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., The American Civil War, Quantum Physics Basics"
              className="mt-1 text-base"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="pdf-upload" className="text-lg font-medium">
              Upload PDF (Optional Source Material)
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
            <Label htmlFor="questionCount" className="text-lg font-medium">
              Number of Questions (max 10)
            </Label>
            <Input
              id="questionCount"
              type="number"
              value={questionCount}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val > 0 && val <= 10) {
                  setQuestionCount(val);
                } else if (e.target.value === "") {
                  setQuestionCount(5);
                } else if (val > 10) {
                  setQuestionCount(10);
                } else {
                  setQuestionCount(1);
                }
              }}
              min="1"
              max="10"
              className="mt-1 text-base"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleGenerateTest}
            disabled={isLoading || !topic.trim()}
            className="w-full text-lg py-3"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Test...
              </>
            ) : (
              "Generate Test Questions"
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

      {generatedQuestions.length > 0 && testTitle && (
        <Card className="w-full max-w-3xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <CheckSquare className="mr-2 h-6 w-6" /> {testTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {generatedQuestions.map((q, index) => (
              <QuestionDisplay key={index} question={q} questionNumber={index + 1} />
            ))}
          </CardContent>
        </Card>
      )}
      {generatedQuestions.length === 0 && !isLoading && !error && (
        <div className="text-center text-muted-foreground mt-8">
          <FileQuestion className="mx-auto h-16 w-16 mb-4 opacity-50" />
          <p>Enter a topic and optionally upload a PDF to generate your test questions.</p>
        </div>
      )}
    </div>
  );
}
