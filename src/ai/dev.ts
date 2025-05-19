
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-chat-history.ts';
import '@/ai/flows/generate-initial-prompt.ts';
import '@/ai/flows/generate-flashcards-flow.ts';
import '@/ai/flows/generate-podcast-script-flow.ts';
import '@/ai/flows/generate-test-flow.ts';

