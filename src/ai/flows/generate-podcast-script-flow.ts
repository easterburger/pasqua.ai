
// Use server directive is required for Genkit flows.
'use server';

/**
 * @fileOverview Generates a podcast script from a given PDF document.
 *
 * - generatePodcastScript - A function that generates the podcast script.
 * - GeneratePodcastScriptInput - The input type for the generatePodcastScript function.
 * - GeneratePodcastScriptOutput - The return type for the generatePodcastScript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePodcastScriptInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF document provided as a data URI, to be used as source material. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
  customTopic: z
    .string()
    .optional()
    .describe('An optional topic or title hint for the podcast, provided by the user.'),
});
export type GeneratePodcastScriptInput = z.infer<typeof GeneratePodcastScriptInputSchema>;

const GeneratePodcastScriptOutputSchema = z.object({
  suggestedTitle: z.string().describe('A suggested title for the podcast episode.'),
  podcastScript: z
    .string()
    .describe('The generated podcast script, formatted for readability and audio delivery.'),
});
export type GeneratePodcastScriptOutput = z.infer<typeof GeneratePodcastScriptOutputSchema>;

export async function generatePodcastScript(input: GeneratePodcastScriptInput): Promise<GeneratePodcastScriptOutput> {
  return generatePodcastScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePodcastScriptPrompt',
  input: {schema: GeneratePodcastScriptInputSchema},
  output: {schema: GeneratePodcastScriptOutputSchema},
  prompt: `You are an expert podcast scriptwriter.
You have been provided with a PDF document. Your task is to create an engaging and informative podcast script based on its content.

{{#if customTopic}}
The user has suggested the topic or title hint for the podcast: '{{{customTopic}}}'. Please use this as a strong guide for the overall theme and title of the script.
{{/if}}

PDF Document Content:
{{media url=pdfDataUri}}

The script should be well-structured and suitable for audio delivery. Ensure it includes:
1.  An engaging introduction that hooks the listener and clearly states the podcast's topic (derived from the PDF and custom topic if provided).
2.  Several distinct segments that break down the key information, concepts, or narratives from the PDF in a clear and digestible manner.
3.  Smooth transitions between segments.
4.  A concluding summary or outro that wraps up the main points and perhaps offers a final thought or call to action if appropriate.

Aim for a conversational and informative tone. The script should be written as if it's meant to be spoken. Use clear language and avoid overly complex sentences.
Break down long paragraphs into shorter, speakable sentences.

Return a suggested title for the podcast episode and the full script.
The script should be formatted with clear indicators for different parts (e.g., INTRO, SEGMENT 1, OUTRO) and speaker cues if you imagine multiple speakers (though a single narrator format is fine).
For example:
Suggested Title: The Future of AI in Healthcare
Podcast Script:
---
INTRO
(Upbeat intro music fades)
Host: Welcome to "Tech Forward," where we explore the cutting edge of technology. Today, we're diving deep into the transformative role of Artificial Intelligence in healthcare, based on the latest findings...
---
SEGMENT 1: AI in Diagnostics
Host: One of the most exciting applications of AI in medicine is in diagnostics. The provided document highlights how AI algorithms are now outperforming traditional methods in detecting certain diseases at earlier stages...
---
(And so on)
---
OUTRO
Host: So, what have we learned today? AI is not just a futuristic concept in healthcare; it's here, making real impacts...
(Outro music begins to fade in)
Host: Thanks for tuning in to "Tech Forward." Join us next time as we explore...
---
`,
});

const generatePodcastScriptFlow = ai.defineFlow(
  {
    name: 'generatePodcastScriptFlow',
    inputSchema: GeneratePodcastScriptInputSchema,
    outputSchema: GeneratePodcastScriptOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.podcastScript || !output.suggestedTitle) {
      console.warn("Podcast script generation did not return expected structure. Input:", input);
      // Fallback if the model doesn't return the expected structure
      return { 
        suggestedTitle: "Error: Could not generate title",
        podcastScript: "Error: The AI failed to generate a podcast script based on the provided document. Please try again or use a different document." 
      };
    }
    return output;
  }
);
