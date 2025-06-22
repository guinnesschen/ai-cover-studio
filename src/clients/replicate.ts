import Replicate from 'replicate';

// Initialize Replicate client
export const replicate = process.env.REPLICATE_API_TOKEN 
  ? new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })
  : null;

// Get webhook URL from environment
export function getWebhookUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  return `${baseUrl}/api/webhooks/replicate`;
}

// Check if Replicate is available
export function isReplicateConfigured() {
  return !!replicate;
}