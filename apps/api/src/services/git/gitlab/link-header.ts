/** Parse RFC 5988 Link header and return the URL for rel="next". */
export function extractNextUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const segments = linkHeader.split(",");
  for (const segment of segments) {
    const match = segment.trim().match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }

  return null;
}
