/** Hands a `upi://` link to the OS (Android shows its UPI app chooser). Separate for tests. */
export function openUpiLink(link: string): void {
  window.location.href = link;
}
