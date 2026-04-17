// Inngest client — durable workflow orchestration
// Docs: https://www.inngest.com/docs/getting-started/nextjs-quick-start

import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'caleums-ai-studio',
  name: 'Caleums AI Studio',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export function isInngestConfigured(): boolean {
  return !!process.env.INNGEST_EVENT_KEY;
}
