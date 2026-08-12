import type { CloudProvider } from "@prisma/client";
import type { CloudCredentials } from "./types.js";
import type { ICloudProvider } from "./provider.interface.js";
import { AWSProvider } from "./aws/aws.provider.js";
import { AzureProvider } from "./azure/azure.provider.js";
import { GCPProvider } from "./gcp/gcp.provider.js";
import { CloudflareProvider } from "./cloudflare/cloudflare.provider.js";

export function getCloudProvider(
  provider: CloudProvider,
  credentials: CloudCredentials
): ICloudProvider {
  switch (provider) {
    case "AWS":
      return new AWSProvider(credentials);
    case "AZURE":
      return new AzureProvider(credentials);
    case "GCP":
      return new GCPProvider(credentials);
    case "CLOUDFLARE":
      return new CloudflareProvider(credentials);
    case "DIGITALOCEAN":
    case "ORACLE":
    case "ALIBABA":
      throw new Error(`${provider} cloud provider coming in Phase 3`);
    default:
      throw new Error(`Unsupported cloud provider: ${provider}`);
  }
}
