
// Use server directive is required for Genkit flows.
'use server';

/**
 * @fileOverview Generates a test with multiple-choice questions for a given topic, optionally using a provided PDF.
 *
 * - generateTest - A function that generates test questions.
 * - GenerateTestInput - The input type for the generateTest function.
 * - GenerateTestOutput - The return type for the generateTest function.
 * - TestQuestion - The type for an individual test question.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TestQuestionSchema = z.object({
  questionText: z.string().describe("The text of the multiple-choice question."),
  options: z.array(z.string()).min(2).max(5).describe("An array of 2 to 5 possible answer choices."),
  correctAnswer: z.string().describe("The exact text of the correct answer, which must be one of the provided options."),
});
export type TestQuestion = z.infer<typeof TestQuestionSchema>;

const GenerateTestInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate test questions.'),
  questionCount: z.number().optional().default(5).describe('The desired number of multiple-choice questions to generate (e.g., 3-10).'),
  pdfDataUri: z.string().optional().describe("An optional PDF document provided as a data URI, to be used as source material. Expected format: 'data:application/pdf;base64,<encoded_data>'."),
});
export type GenerateTestInput = z.infer<typeof GenerateTestInputSchema>;

const GenerateTestOutputSchema = z.object({
  questions: z.array(TestQuestionSchema).describe('A list of generated multiple-choice test questions.'),
  title: z.string().optional().describe('A suggested title for the generated test, based on the topic and PDF if provided.')
});
export type GenerateTestOutput = z.infer<typeof GenerateTestOutputSchema>;

export async function generateTest(input: GenerateTestInput): Promise<GenerateTestOutput> {
  return generateTestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTestPrompt',
  input: {schema: GenerateTestInputSchema},
  output: {schema: GenerateTestOutputSchema},
  prompt: `You are an expert in creating educational assessments.
Generate a set of {{questionCount}} multiple-choice questions for the topic: '{{{topic}}}'.
Also, suggest a suitable title for this test.

{{#if pdfDataUri}}
You have been provided with a PDF document. Use the content from this document as the primary source material for generating the questions.
Document content: {{media url=pdfDataUri}}
Refer to this document to extract key concepts, terms, and information for the questions.
{{/if}}

Each question must:
1. Be a multiple-choice question.
2. Have a clear 'questionText'.
3. Have between 2 and 5 'options' (possible answers).
4. Have a 'correctAnswer' that is one of the provided 'options'.

Ensure the questions accurately assess understanding of the topic, based on general knowledge or the provided PDF.
The difficulty should be appropriate for a general understanding test.

Return the questions as a list of objects, and include a suggested test 'title'.
For example, for the topic "Solar System Basics" with count 2, without a PDF:
{
  "title": "Solar System Basics Quiz",
  "questions": [
    {
      "questionText": "Which planet is known as the Red Planet?",
      "options": ["Earth", "Mars", "Jupiter", "Venus"],
      "correctAnswer": "Mars"
    },
    {
      "questionText": "What is the name of the star at the center of our Solar System?",
      "options": ["Proxima Centauri", "Sirius", "The Sun", "Alpha Centauri"],
      "correctAnswer": "The Sun"
    }
  ]
}

If a PDF about "The French Revolution" was provided, an example might be:
{
  "title": "The French Revolution Assessment",
  "questions": [
    {
      "questionText": "According to the document, what year did the French Revolution begin?",
      "options": ["1789", "1799", "1804", "1776"],
      "correctAnswer": "1789 (based on PDF content)"
    },
    {
      "questionText": "Which major event is often cited as the storming of a key Parisian prison?",
      "options": ["The Reign of Terror", "The Tennis Court Oath", "The Storming of the Bastille", "The March on Versailles"],
      "correctAnswer": "The Storming of the Bastille (based on PDF content)"
    }
  ]
}
`,
});

const generateTestFlow = ai.defineFlow(
  {
    name: 'generateTestFlow',
    inputSchema: GenerateTestInputSchema,
    outputSchema: GenerateTestOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.questions || output.questions.length === 0) {
      console.warn("Test generation did not return expected structure. Input:", input);
      return { title: "Test Generation Error", questions: [] };
    }
    // Validate that each correctAnswer is actually one of the options
    output.questions.forEach(q => {
        if (!q.options.includes(q.correctAnswer)) {
            console.warn("Generated question has a correctAnswer not in its options:", q);
            // Attempt to self-correct or mark as problematic. For now, just log.
            // Potentially, you could pick the first option as a fallback, or regenerate.
        }
    });
    return output;
  }
);

