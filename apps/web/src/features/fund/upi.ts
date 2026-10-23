import { UPI_BASE } from '@stepq/core';

/** The payee UPI ID (`pa`) of the base payload, shown on W06/W07 and copied by "Copy UPI ID". */
export const UPI_ID = new URLSearchParams(UPI_BASE.slice(UPI_BASE.indexOf('?') + 1)).get('pa')!;
