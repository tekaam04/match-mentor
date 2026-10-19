/** Parses a comma/semicolon/whitespace-separated list of emails, normalized to lowercase. */
export function parseEmailList(raw: string | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@")),
    ),
  ];
}

export function adminEmails(): string[] {
  return parseEmailList(process.env.SEED_ADMIN_EMAILS);
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}
