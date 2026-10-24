import { z } from 'zod';
import { email, honeypot, optionalPhone, personName, requestId } from './fields';

export const TOPICS = ['partnership', 'investment', 'feedback', 'press', 'other'] as const;

/** Chip labels (W16) and email labels for `topic`. */
export const TOPIC_LABELS: Record<(typeof TOPICS)[number], string> = {
  partnership: 'Partnership',
  investment: 'Investment',
  feedback: 'Feedback',
  press: 'Press',
  other: 'Other',
};

export const founderMessageInput = z.object({
  name: personName,
  email,
  phone: optionalPhone,
  topic: z.enum(TOPICS, { errorMap: () => ({ message: 'Pick one' }) }),
  message: z
    .string({ required_error: 'Write a message' })
    .trim()
    .min(10, 'Tell us a little more')
    .max(2000, 'Keep it under 2000 characters'),
  website: honeypot,
  requestId,
});

export type FounderMessageInput = z.infer<typeof founderMessageInput>;
