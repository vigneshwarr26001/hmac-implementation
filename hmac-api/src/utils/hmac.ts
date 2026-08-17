// region Imports
import crypto from 'node:crypto';

// endregion

// region Pure HMAC Signing Primitives
// Extracted from the Fastify hook so the signing/verification recipe is independently
// testable and can double as the reference snippet for client implementers.
export const hashBody = (body: unknown): string =>
    crypto.createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');

export const buildCanonicalMessage = (
    method: string,
    url: string,
    timestamp: string,
    bodyHash: string,
): string => `${method}.${url}.${timestamp}.${bodyHash}`;

export const computeSignature = (secret: string, message: string): string =>
    crypto.createHmac('sha256', secret).update(message).digest('hex');
// endregion
