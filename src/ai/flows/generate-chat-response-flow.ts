
'use server';
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { fetchWebsiteContentTool } from '@/ai/tools/fetch-website-content-tool';

// Schema for individual parts of a message (text or inline data)
const GeminiPartSchema = z.object({
  text: z.string().optional(),
  inlineData: z.object({
    mimeType: z.string(),
    data: z.string(), // base64 encoded
  }).optional(),
});

// Schema for a single message in the chat history
const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']), // Genkit expects 'user' or 'model' for history
  parts: z.array(GeminiPartSchema),
});
export type HistoryMessage = z.infer<typeof HistoryMessageSchema>;

// Input schema for the chat flow
const GenerateChatResponseInputSchema = z.object({
  prompt: z.string().describe("The user's current message/question."),
  history: z.array(HistoryMessageSchema).optional().describe("The preceding chat history."),
  media: z.object({
    name: z.string().describe("Name of the uploaded file."),
    type: z.string().describe("MIME type of the uploaded file."),
    dataUri: z.string().describe("Data URI of the uploaded file."),
  }).optional().describe("Optional media uploaded by the user with the current prompt."),
});
export type GenerateChatResponseInput = z.infer<typeof GenerateChatResponseInputSchema>;

export const generateChatResponseFlow = ai.defineFlow(
  {
    name: 'generateChatResponseFlow',
    inputSchema: GenerateChatResponseInputSchema,
    outputSchema: z.object({ fullResponse: z.string().describe("The full, accumulated text response from the AI.") }),
    streamSchema: z.object({ // Describes the structure of each yielded chunk in the stream
      textChunk: z.string().optional().describe("A chunk of text from the AI's response."),
      error: z.string().optional().describe("An error message, if an error occurred during streaming."),
      toolEvent: z.object({
        type: z.enum(['tool_code_request', 'tool_code_result']),
        toolName: z.string(),
        message: z.string().optional(),
      }).optional().describe("An event related to tool usage, e.g., indicating a tool is being called.")
    }),
  },
  async function* (input) { // This is an async generator function
    let currentPromptParts: Array<{text?: string; inlineData?: {mimeType: string; data: string}}> = [{ text: input.prompt }];

    if (input.media?.dataUri && input.media.type) {
      const base64Data = input.media.dataUri.split(',')[1];
      if (base64Data) {
        currentPromptParts.push({
          inlineData: { mimeType: input.media.type, data: base64Data },
        });
      }
    }

    const llmHistory: HistoryMessage[] = input.history || [];

    const systemInstruction = "You are a helpful AI assistant. If a URL is mentioned by the user, use the 'fetchWebsiteContentTool' to get its content and use that content to answer the question. If you use the tool, briefly inform the user before you display the result (e.g., 'Fetching content from [URL]... then after the tool responds, provide your answer based on the content.'). If the tool returns an error, inform the user about the error and proceed without the content if possible, or state that you cannot complete the request due to the error.";

    let accumulatedResponse = "";
    try {
      const { stream, response: fullResponsePromise } = ai.generateStream({
        model: 'gemini-1.5-flash-latest', // Or your configured default model
        prompt: { role: 'user', parts: currentPromptParts },
        history: llmHistory,
        tools: [fetchWebsiteContentTool],
        system: systemInstruction,
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          accumulatedResponse += chunk.text;
          yield { textChunk: chunk.text };
        }
        if (chunk.toolRequests && chunk.toolRequests.length > 0) {
          // Inform client that a tool is being called
          // For simplicity, just taking the first tool request if multiple (though rare for this setup)
          yield { toolEvent: { type: 'tool_code_request', toolName: chunk.toolRequests[0].name, message: `Fetching content from ${chunk.toolRequests[0].input.url}...` } };
        }
         // Note: Genkit handles executing the tool and providing its response back to the LLM.
         // We don't typically see `toolResponses` here unless we're manually orchestrating.
         // The LLM will then generate further text based on the tool's output.
      }

      // Awaiting fullResponsePromise ensures all tool calls and subsequent LLM turns are complete.
      const finalLlmResponse = await fullResponsePromise;
      const finalResponseText = finalLlmResponse.text || "";

      // It's possible that the stream already yielded all text.
      // This check ensures any final text not caught by the loop is returned.
      // Or if the entire response was a single non-streamed block (e.g., after a tool call if model streams only initial parts).
      if (finalResponseText && finalResponseText !== accumulatedResponse) {
        if (accumulatedResponse.length > 0 && finalResponseText.startsWith(accumulatedResponse)) {
           const remainingText = finalResponseText.substring(accumulatedResponse.length);
           if (remainingText.length > 0) {
             yield { textChunk: remainingText };
             accumulatedResponse += remainingText;
           }
         } else if (accumulatedResponse.length === 0 && finalResponseText.length > 0) {
           yield { textChunk: finalResponseText };
           accumulatedResponse = finalResponseText;
         }
      }
      return { fullResponse: accumulatedResponse };
    } catch (e: any) {
      console.error("Error in generateChatResponseFlow stream processing:", e);
      const errorMessage = e.message || "An error occurred while processing the stream.";
      yield { error: errorMessage };
      // Return what has been accumulated, or an empty string if nothing.
      return { fullResponse: accumulatedResponse || `[Error: ${errorMessage}]` };
    }
  }
);
