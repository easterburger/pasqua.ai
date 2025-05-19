
// Use server directive is required for Genkit flows.
'use server';

/**
 * @fileOverview Generates flashcards for a given topic.
 *
 * - generateFlashcards - A function that generates flashcards.
 * - GenerateFlashcardsInput - The input type for the generateFlashcards function.
 * - GenerateFlashcardsOutput - The return type for the generateFlashcards function.
 * - Flashcard - The type for an individual flashcard.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlashcardSchema = z.object({
  front: z.string().describe('The question, term, or concept for the front of the flashcard.'),
  back: z.string().describe('The answer, definition, or explanation for the back of the flashcard.'),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

const GenerateFlashcardsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate flashcards.'),
  count: z.number().optional().default(5).describe('The desired number of flashcards to generate (e.g., 5-10).'),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe('A list of generated flashcards.'),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `You are an expert in creating educational content.
Generate a set of {{count}} flashcards for the topic: '{{{topic}}}'.
Each flashcard must have a 'front' (a question, term, or concept) and a 'back' (the corresponding answer, definition, or explanation).
Ensure the content is concise and suitable for flashcard format.
Return the flashcards as a list of objects, where each object has a 'front' and a 'back' key.
For example, for the topic "Basic Chemistry Terms":
[
  { "front": "What is the chemical symbol for water?", "back": "H₂O" },
  { "front": "Define 'atom'.", "back": "The smallest unit of a chemical element." }
]
`,
});

const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.flashcards) {
      // Fallback or error handling if the model doesn't return the expected structure
      // This can be enhanced, e.g., by trying a simpler prompt or returning a default error
      console.warn("Flashcard generation did not return expected structure. Input:", input);
      return { flashcards: [] };
    }
    return output;
  }
);

