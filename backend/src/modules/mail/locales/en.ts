import type { EmailStrings } from './vi';

/** English copy for outgoing email. Typed against vi so the two cannot drift. */
export const en: EmailStrings = {
  dateLocale: 'en-GB',
  subject: (eventTitle: string) => `Your tickets - ${eventTitle}`,
  preheader: (count: number) =>
    count === 1 ? 'Your ticket is ready.' : `Your ${count} tickets are ready.`,
  greeting: (name: string) => `Hi ${name},`,
  intro: (count: number) =>
    count === 1
      ? 'Your ticket has been issued. Show the QR code below to staff at the gate.'
      : `Your ${count} tickets have been issued. Show the QR codes below to staff at the gate.`,
  ticketHeading: (index: number, total: number) =>
    `Ticket ${index} of ${total}`,
  codeLabel: 'Ticket code',
  remainingHeading: (count: number) => `${count} more tickets`,
  remainingHint:
    'Open the eTicket app to see the QR codes for the remaining tickets in this order.',
  footer: 'This is an automated message, please do not reply.',
};
