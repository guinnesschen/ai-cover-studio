import Replicate from 'replicate';

console.log('[REPLICATE CLIENT] Initializing Replicate client...');
console.log('[REPLICATE CLIENT] Environment check:', {
  hasToken: !!process.env.REPLICATE_API_TOKEN,
  tokenPrefix: process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.substring(0, 8) + '...' : 'none',
  nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
  vercelUrl: process.env.VERCEL_URL,
  nodeEnv: process.env.NODE_ENV,
});

// Initialize Replicate client
export const replicate = process.env.REPLICATE_API_TOKEN 
  ? new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })
  : null;

if (replicate) {
  console.log('[REPLICATE CLIENT] ✓ Replicate client initialized successfully');
} else {
  console.error('[REPLICATE CLIENT] ✗ Replicate client NOT initialized - missing API token');
}

// Get webhook URL from environment
export function getWebhookUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/api/webhooks/replicate`;
  
  console.log('[REPLICATE CLIENT] Webhook URL generation:', {
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    vercelUrl: process.env.VERCEL_URL,
    baseUrl,
    webhookUrl,
    isLocalhost: webhookUrl.includes('localhost'),
  });
  
  return webhookUrl;
}

// Check if Replicate is available
export function isReplicateConfigured() {
  const configured = !!replicate;
  console.log('[REPLICATE CLIENT] Configuration check:', { configured });
  return configured;
}