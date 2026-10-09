/**
 * The session's end as the reader's own clock shows it: hours and minutes in
 * local time, for the session line and the expiry screen. Unlike the sample's
 * dates (UTC, so they read the same everywhere), this is a live time the
 * reader compares with the clock on their device.
 */
export function sessionTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}
