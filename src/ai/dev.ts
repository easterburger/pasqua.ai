
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-chat-history.ts';
import '@/ai/flows/generate-initial-prompt.ts';
import '@/ai/flows/generate-flashcards-flow.ts';
import '@/ai/flows/generate-podcast-script-flow.ts';
import '@/ai/flows/generate-test-flow.ts';
import '@/ai/flows/generate-study-guide-flow.ts'; 
// Removed: import '@/ai/flows/generate-chat-response-flow.ts';

// Tools are typically not directly imported here for `genkit start`
// unless they are part of a flow that needs to be explicitly loaded.
// Genkit discovers tools referenced by flows.

    
