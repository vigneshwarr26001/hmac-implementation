import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app';
import { signRequest } from '../helpers/signRequest';

// region Suite
// userRouter.ts wires authenticateHmac at `preValidation`, which runs after body
// parsing (so the raw body is available to hash) but strictly before Zod's
// schema Validation stage. bodySchema (z.record(...)) rejects a non-object body
// such as an array. Sending the SAME array body with a valid vs. invalid
// signature must diverge: valid auth lets the request reach (and fail) Zod
// Validation (400); invalid auth is rejected at preValidation before Zod ever runs (403).
describe('POST /user/withHmac - auth gates before Zod validation', () => {
    let app: FastifyInstance;

    const METHOD = 'POST';
    const URL = '/user/withHmac';
    const ARRAY_BODY = [1, 2, 3];

    beforeAll(async () => {
        app = await buildApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it('with a VALID signature over an array body: passes auth, then fails Zod shape validation (400)', async () => {
        const { signature, timestamp } = signRequest(METHOD, URL, ARRAY_BODY);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': signature,
                'x-hmac-timestamp': timestamp,
            },
            payload: ARRAY_BODY,
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            statusCode: 400,
            status: 'Failure',
            message: 'Request validation failed',
            response: [],
        });
    });

    it('with an INVALID signature over the identical array body: rejected at preValidation before Zod runs (403)', async () => {
        // Same array body, same timestamp shape, but signed with the wrong secret --
        // guaranteed to fail the signature comparison (still 64 hex chars, so it's the
        // value check that fails, not the length guard) without ever reaching Zod.
        const { signature, timestamp } = signRequest(METHOD, URL, ARRAY_BODY, undefined, 'not-the-real-secret');

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': signature,
                'x-hmac-timestamp': timestamp,
            },
            payload: ARRAY_BODY,
        });

        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Invalid Authentication Signature',
            response: false,
        });
    });
});
// endregion
