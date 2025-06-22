// Shared validation helpers
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeJobId(jobId: string): string {
  // Remove any path traversal attempts and special characters
  return jobId.replace(/[^a-zA-Z0-9-_]/g, '');
}