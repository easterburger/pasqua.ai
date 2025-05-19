
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FetchWebsiteInputSchema = z.object({
  url: z.string().url().describe('The URL of the website to fetch content from.'),
});

const FetchWebsiteOutputSchema = z.object({
  textContent: z.string().describe('The extracted text content of the website.'),
  error: z.string().optional().describe('Error message if fetching or parsing failed.'),
});

// Basic HTML tag stripper (very naive)
function stripHtmlTags(html: string): string {
  // Remove script and style elements
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  // Remove all other HTML tags
  clean = clean.replace(/<[^>]*>?/gm, ' ');
  // Replace multiple spaces/newlines with a single space and trim
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

export const fetchWebsiteContentTool = ai.defineTool(
  {
    name: 'fetchWebsiteContentTool',
    description: 'Fetches and extracts the main text content from a given website URL. Use this to get information from web pages to answer user questions or perform tasks like summarization.',
    inputSchema: FetchWebsiteInputSchema,
    outputSchema: FetchWebsiteOutputSchema,
  },
  async (input) => {
    try {
      const response = await fetch(input.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // Add a timeout to prevent hanging indefinitely
        signal: AbortSignal.timeout(10000) // 10 seconds timeout
      });

      if (!response.ok) {
        return { textContent: "", error: `Failed to fetch URL: ${response.status} ${response.statusText}` };
      }
      const htmlContent = await response.text();
      const textContent = stripHtmlTags(htmlContent);

      const MAX_LENGTH = 20000; // Characters, ~5k-7k tokens. Adjust as needed.
      if (textContent.length === 0 && htmlContent.length > 0) {
        return { textContent: "", error: "Could not extract meaningful text content from the page. It might be heavily JavaScript-reliant or have an unusual structure."};
      }
      if (textContent.length > MAX_LENGTH) {
        return { textContent: textContent.substring(0, MAX_LENGTH) + "...\n[Content truncated due to length]", error: "Content truncated due to length." };
      }
      return { textContent };
    } catch (error: any) {
      console.error(`Error fetching website content for ${input.url}:`, error);
      if (error.name === 'TimeoutError') {
        return { textContent: "", error: `Timeout: The request to ${input.url} took too long to respond.` };
      }
      return { textContent: "", error: `Error fetching or parsing website: ${error.message}` };
    }
  }
);
