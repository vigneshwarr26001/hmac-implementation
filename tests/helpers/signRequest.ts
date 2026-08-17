// region Imports
import crypto from 'node:crypto';

// endregion

// region Test-Only Signing Client
// Deliberately NOT importing src/utils/hmac.ts: this is an independent re-implementation
// of the client-side signing recipe, so a broken server implementation can't silently
// pass its own tests. Must be kept in sync with the recipe documented for real clients.
// The secret matches vitest.config.ts's test.env.AUTH_SIGNATURE.
export const TEST_AUTH_SIGNATURE = 'test-only-secret-do-not-use-in-production';

export interface SignedRequest {
    signature: string;
    timestamp: string;
}

export const signRequest = (
    method: string,
    url: string,
    body: unknown,
    timestamp: string = Date.now().toString(),
    secret: string = TEST_AUTH_SIGNATURE,
): SignedRequest => {
    const bodyHash = crypto.createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
    const message = `${method}.${url}.${timestamp}.${bodyHash}`;
    const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');

    return { signature, timestamp };
};
// endregion
