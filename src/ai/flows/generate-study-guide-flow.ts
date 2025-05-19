
// Use server directive is required for Genkit flows.
'use server';

/**
 * @fileOverview Generates a study guide for a given topic, optionally using a provided PDF and custom sections.
 *
 * - generateStudyGuide - A function that generates the study guide.
 * - GenerateStudyGuideInput - The input type for the generateStudyGuide function.
 * - GenerateStudyGuideOutput - The return type for the generateStudyGuide function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStudyGuideInputSchema = z.object({
  topic: z.string().describe('The main topic for the study guide.'),
  pdfDataUri: z.string().optional().describe("An optional PDF document provided as a data URI, to be used as source material. Expected format: 'data:application/pdf;base64,<encoded_data>'."),
  customSections: z.string().optional().describe('Optional: A list of specific sections or subtopics (e.g., comma-separated or newline-separated) the user wants to be included or focused on in the study guide.'),
});
export type GenerateStudyGuideInput = z.infer<typeof GenerateStudyGuideInputSchema>;

const GenerateStudyGuideOutputSchema = z.object({
  suggestedTitle: z.string().describe('A suggested title for the generated study guide.'),
  studyGuideContent: z.string().describe('The full content of the generated study guide, formatted for readability (e.g., using markdown-like headings).'),
});
export type GenerateStudyGuideOutput = z.infer<typeof GenerateStudyGuideOutputSchema>;

export async function generateStudyGuide(input: GenerateStudyGuideInput): Promise<GenerateStudyGuideOutput> {
  return generateStudyGuideFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudyGuidePrompt',
  input: {schema: GenerateStudyGuideInputSchema},
  output: {schema: GenerateStudyGuideOutputSchema},
  prompt: `You are an expert in creating comprehensive and easy-to-understand educational study guides.
Your task is to generate a study guide for the topic: '{{{topic}}}'.
Also, suggest a suitable title for this study guide.

{{#if pdfDataUri}}
A PDF document has been provided. Use the content from this document as the primary source material for generating the study guide.
Document content: {{media url=pdfDataUri}}
Extract key information, concepts, definitions, and examples from this document.
{{/if}}

{{#if customSections}}
The user has requested that the study guide include or specifically focus on the following sections/subtopics:
"{{{customSections}}}"
Please ensure these areas are well-covered and integrated logically into the study guide structure.
{{/if}}

The study guide should be well-structured and aim to help someone learn and revise the topic effectively. Ensure it includes:
1.  An Introduction: Briefly introduce the topic and the scope of the study guide.
2.  Key Concepts and Definitions: Clearly define important terms and concepts related to the topic.
3.  Main Content Sections: Break down the topic into logical sections and subsections. Use clear headings (e.g., ## Heading, ### Subheading) for organization.
    - For each section, provide summaries of important information, explanations of complex ideas, and relevant examples if applicable.
4.  Summary/Conclusion: Briefly recap the main points covered in the study guide.
5.  (Optional, if relevant to the topic) A few example questions or thought prompts to encourage further reflection (do not provide answers to these questions).

Format the studyGuideContent for readability. Use markdown-like syntax for headings (e.g., # Title, ## Section, ### Subsection). Use bullet points or numbered lists for clarity where appropriate.
Avoid overly dense paragraphs; break information into digestible chunks.

Example Output Structure:
{
  "suggestedTitle": "Comprehensive Guide to Photosynthesis",
  "studyGuideContent": "# Comprehensive Guide to Photosynthesis\n\n## Introduction\nThis guide covers the fundamental aspects of photosynthesis...\n\n## Key Concepts\n- **Chlorophyll:** The green pigment...\n- **ATP:** Adenosine triphosphate, the energy currency...\n\n## The Process of Photosynthesis\n### Light-Dependent Reactions\nDetails about light reactions...\n\n### Calvin Cycle (Light-Independent Reactions)\nDetails about the Calvin cycle...\n\n## Factors Affecting Photosynthesis\n...\n\n## Summary\nPhotosynthesis is a vital process...\n\n## Review Questions\n1. What are the two main stages of photosynthesis?\n2. Explain the role of chlorophyll."
}

Return the generated study guide with a suggested title and the full content.
`,
});

const generateStudyGuideFlow = ai.defineFlow(
  {
    name: 'generateStudyGuideFlow',
    inputSchema: GenerateStudyGuideInputSchema,
    outputSchema: GenerateStudyGuideOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.studyGuideContent || !output.suggestedTitle) {
      console.warn("Study guide generation did not return expected structure. Input:", input);
      // Fallback if the model doesn't return the expected structure
      return {
        suggestedTitle: "Error: Could not generate title",
        studyGuideContent: "Error: The AI failed to generate a study guide. Please try again or refine your inputs."
      };
    }
    return output;
  }
);

