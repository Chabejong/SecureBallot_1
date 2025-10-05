export interface VoteToken {
  pollId: string;
  fingerprint: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

async function generateNonce(): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function signData(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('Crypto API failed, using fallback');
    }
  }

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function generateVoteToken(
  pollId: string,
  fingerprint: string
): Promise<VoteToken> {
  const timestamp = Date.now();
  const nonce = await generateNonce();
  
  const dataToSign = `${pollId}:${fingerprint}:${timestamp}:${nonce}`;
  const signature = await signData(dataToSign);

  return {
    pollId,
    fingerprint,
    timestamp,
    nonce,
    signature,
  };
}

export async function validateVoteTokenClient(token: VoteToken): Promise<boolean> {
  const maxAge = 5 * 60 * 1000;
  
  if (Date.now() - token.timestamp > maxAge) {
    return false;
  }

  const dataToSign = `${token.pollId}:${token.fingerprint}:${token.timestamp}:${token.nonce}`;
  const expectedSignature = await signData(dataToSign);

  return expectedSignature === token.signature;
}

export function serializeVoteToken(token: VoteToken): string {
  return btoa(JSON.stringify(token));
}

export function deserializeVoteToken(serialized: string): VoteToken | null {
  try {
    return JSON.parse(atob(serialized));
  } catch (e) {
    return null;
  }
}
