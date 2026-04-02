/** Emails in `@local@domain` mention form from notification text. */
export function extractMentionedEmails(notification: string): string[] {
  const emailRegex =
    /(?:^|\s)@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emails: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = emailRegex.exec(notification)) !== null) {
    emails.push(match[1].toLowerCase());
  }
  return emails;
}
