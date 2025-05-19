
"use client";

import * as React from "react";
import type { TestQuestion } from "@/ai/flows/generate-test-flow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

interface QuestionDisplayProps {
  question: TestQuestion;
  questionNumber: number;
}

export function QuestionDisplay({ question, questionNumber }: QuestionDisplayProps) {
  const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null);
  const [showAnswer, setShowAnswer] = React.useState(false);

  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Question {questionNumber}</CardTitle>
        <CardDescription className="text-base pt-1">{question.questionText}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedAnswer ?? undefined}
          onValueChange={setSelectedAnswer}
          className="space-y-2"
        >
          {question.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`q${questionNumber}-option${index}`} />
              <Label htmlFor={`q${questionNumber}-option${index}`} className="text-sm">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {selectedAnswer && !showAnswer && (
          <div className={`mt-2 p-2 rounded-md text-sm font-medium flex items-center
            ${isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
            {isCorrect ? <CheckCircle className="h-5 w-5 mr-2" /> : <XCircle className="h-5 w-5 mr-2" />}
            {isCorrect ? "Correct!" : "Incorrect."}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAnswer(!showAnswer)}>
            {showAnswer ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showAnswer ? "Hide Answer" : "Show Answer"}
            </Button>
        </div>

        {showAnswer && (
          <div className="mt-2 p-3 bg-muted rounded-md">
            <p className="text-sm font-semibold">Correct Answer:</p>
            <p className="text-sm text-primary">{question.correctAnswer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
