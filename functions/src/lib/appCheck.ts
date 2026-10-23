import type { CallableOptions } from 'firebase-functions/v2/https';
import { ACTION_SIGNING_SECRET, REGION, RESEND_API_KEY } from '../config';

export const callOptions: CallableOptions = {
  region: REGION,
  enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true',
  secrets: [RESEND_API_KEY, ACTION_SIGNING_SECRET],
};
