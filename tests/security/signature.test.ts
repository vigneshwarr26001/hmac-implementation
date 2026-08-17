import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app';
import { signRequest } from '../helpers/signRequest';

// region Suite
// authenticateHmac.ts recreates the canonical message
// (method.url.timestamp.sha256Hex(JSON.stringify(body ?? {}))) server-side and
// compares it, via crypto.timingSafeEqual, against the client-supplied x-hmac.
// Anything that changes what the server recomputes (body, method, url) without
// a matching client signature must fail; anything that corrupts the client
// signature bytes must fail safely (never a 500).
describe('POST /user/withHmac - signature verification', () => {
    let app: FastifyInstance;

    const METHOD = 'POST';
    const URL = '/user/withHmac';

    beforeAll(async () => {
        app = await buildApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it('rejects a tampered body sent under a signature computed for a different body', async () => {
        const signedBody = { amount: 100 };
        const tamperedBody = { amount: 999 };
        const { signature, timestamp } = signRequest(METHOD, URL, signedBody);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': signature,
                'x-hmac-timestamp': timestamp,
            },
            payload: tamperedBody,
        });

        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Invalid Authentication Signature',
            response: false,
        });
    });

    it('rejects a signature computed with the wrong secret', async () => {
        const body = { amount: 100 };
        // HMAC-SHA256 hex digests are always 64 hex characters regardless of the
        // secret used, so a wrong-secret signature has the SAME length as the
        // server's expected signature -- it fails the value comparison, not the
        // length guard. Confirmed empirically (see task notes) before asserting here.
        const { signature, timestamp } = signRequest(METHOD, URL, body, undefined, 'a-completely-different-secret');

        expect(signature).toHaveLength(64);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': signature,
                'x-hmac-timestamp': timestamp,
            },
            payload: body,
        });

        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Invalid Authentication Signature',
            response: false,
        });
    });

    it('rejects a signature replayed against a different url (query string appended)', async () => {
        const body = { amount: 100 };
        // Signed for the bare path; request.url in Fastify is path+query, so
        // injecting with an appended query string changes the canonical message
        // the server recomputes, even though method/timestamp/body are unchanged.
        const { signature, timestamp } = signRequest(METHOD, URL, body);

        const response = await app.inject({
            method: METHOD,
            url: `${URL}?x=1`,
            headers: {
                'x-hmac': signature,
                'x-hmac-timestamp': timestamp,
            },
            payload: body,
        });

        // The server's recomputed signature is still a 64-char sha256 hex digest
        // (fixed output size), so this always fails the value comparison, not the
        // length guard -- the length guard only fires on a malformed client value.
        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Invalid Authentication Signature',
            response: false,
        });
    });

    it('rejects a short/malformed hex x-hmac without ever crashing to 500', async () => {
        const body = { amount: 100 };
        const timestamp = Date.now().toString();
        // 'not-hex-and-wrong-length' is 24 chars, vs. the server's 64-char sha256 hex
        // digest, so this is caught by the plain .length comparison before Buffer.from
        // is ever called. The important, explicit assertion is the one below it:
        // whichever branch fires, the response must be a clean 403, never a 500.
        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': 'not-hex-and-wrong-length',
                'x-hmac-timestamp': timestamp,
            },
            payload: body,
        });

        expect(response.statusCode).not.toBe(500);
        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Invalid Authentication Signature Length',
            response: false,
        });
    });

    it('rejects a 64-char non-hex x-hmac (passes the length guard, exercises the try/catch) without crashing to 500', async () => {
        const body = { amount: 100 };
        const timestamp = Date.now().toString();
        // Same .length as a real sha256 hex digest (64), but not valid hex: Buffer.from(str, 'hex')
        // silently stops at the first invalid character, producing a 0-length buffer, which makes
        // crypto.timingSafeEqual throw a length-mismatch RangeError. That throw must be caught by
        // authenticateHmac's try/catch rather than propagating into a 500.
        const malformedHex = 'z'.repeat(64);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': malformedHex,
                'x-hmac-timestamp': timestamp,
            },
            payload: body,
        });

        expect(response.statusCode).not.toBe(500);
        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Signature Authentication failed',
            response: false,
        });
    });
});
// endregion
