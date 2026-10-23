import { z } from 'zod';

export type ActionKind = 'verifyBacking' | 'approveAmbassador' | 'reserve';

export const actionTokenInput = z.object({ token: z.string().min(1) });
