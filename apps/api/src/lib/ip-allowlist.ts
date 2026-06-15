import { BlockList, isIP } from "node:net";

export function isValidAllowlistEntry(entry: string): boolean {
  const trimmed = entry.trim();
  if (!trimmed) return false;

  if (trimmed.includes("/")) {
    const [subnet, prefixStr] = trimmed.split("/");
    if (!subnet || prefixStr === undefined || prefixStr.includes("/")) return false;
    const prefix = Number(prefixStr);
    if (!Number.isInteger(prefix)) return false;

    const version = isIP(subnet);
    if (version === 4) return prefix >= 0 && prefix <= 32;
    if (version === 6) return prefix >= 0 && prefix <= 128;
    return false;
  }

  return isIP(trimmed) !== 0;
}

export function normalizeAllowlist(entries: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!isValidAllowlistEntry(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized;
}

export function isIpAllowed(clientIp: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;

  const ipVersion = isIP(clientIp);
  if (ipVersion === 0) return false;

  const blockList = new BlockList();
  for (const entry of allowlist) {
    const trimmed = entry.trim();
    if (!isValidAllowlistEntry(trimmed)) continue;

    try {
      if (trimmed.includes("/")) {
        const [subnet, prefixStr] = trimmed.split("/");
        const prefix = Number(prefixStr);
        const version = isIP(subnet!);
        if (version === 4) blockList.addSubnet(subnet!, prefix, "ipv4");
        else if (version === 6) blockList.addSubnet(subnet!, prefix, "ipv6");
      } else {
        const version = isIP(trimmed);
        if (version === 4) blockList.addAddress(trimmed, "ipv4");
        else if (version === 6) blockList.addAddress(trimmed, "ipv6");
      }
    } catch {
      continue;
    }
  }

  return blockList.check(clientIp, ipVersion === 4 ? "ipv4" : "ipv6");
}
