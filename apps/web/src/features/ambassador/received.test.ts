import { describe, expect, it } from 'vitest';
import { receivedHref, receivedMessage } from './received';

const REST =
  'StepQ will review your application. If you are approved, you will get a congratulations email from StepQ.';

describe('W11 message', () => {
  it('thanks the person by first name', () => {
    expect(receivedMessage('Riya')).toBe(`Thanks, Riya. ${REST}`);
  });
  it('leaves a missing or blank name out', () => {
    expect(receivedMessage(null)).toBe(`Thanks. ${REST}`);
    expect(receivedMessage('   ')).toBe(`Thanks. ${REST}`);
  });
  it('caps the name at 60 characters', () => {
    expect(receivedMessage('A'.repeat(200))).toBe(`Thanks, ${'A'.repeat(60)}. ${REST}`);
  });
  it('builds the W11 link', () => {
    expect(receivedHref('Riya')).toBe('/ambassadors/received?name=Riya');
  });
});
