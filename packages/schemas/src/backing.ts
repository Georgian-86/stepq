import { z } from 'zod';
import { honeypot, indianMobile, personName, requestId } from './fields';

export const AMOUNT_PRESETS = [101, 251, 501, 1001] as const;

export const backingInput = z.object({
  name: personName,
  phone: indianMobile,
  amount: z
    .number({ required_error: 'Enter an amount', invalid_type_error: 'Enter an amount' })
    .int('Enter a whole amount')
    .min(1, 'Enter an amount')
    .max(100000, 'Maximum is ₹1,00,000'),
  showOnWall: z.boolean(),
  website: honeypot,
  requestId,
});

export type BackingInput = z.infer<typeof backingInput>;
