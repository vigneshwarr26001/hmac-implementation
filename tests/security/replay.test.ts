import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app';
import { signRequest } from '../helpers/signRequest';

// region Suite
// authenticateHmac.ts's isReplay(): only signatures that pass verification are
// cached (keyed on the signature itself, TTL 120000ms). An exact repeat of a
// previously-accepted signature must be rejected the second time it's seen.
describe('POST /user/withHmac - replay protection', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await buildApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it('accepts the first use of a signature and rejects an identical replay of it', async () => {
        const METHOD = 'POST';
        const URL = '/user/withHmac';
        const BODY = { orderId: 'REPLAY-1', amount: 42 };
        const { signature, timestamp } = signRequest(METHOD, URL, BODY);

        const headers = {
            'x-hmac': signature,
            'x-hmac-timestamp': timestamp,
        };

        const firstResponse = await app.inject({
            method: METHOD,
            url: URL,
            headers,
            payload: BODY,
        });

        expect(firstResponse.statusCode).toBe(200);
        const firstJson = firstResponse.json();
        expect(firstJson.status).toBe('Success');
        expect(firstJson.message).toBe('Request processed successfully with HMAC authentication');
        expect(firstJson.response.payload).toEqual(BODY);

        // Byte-identical replay: same headers object, same payload object -- light-my-request
        // JSON.stringifies BODY the same deterministic way both times.
        const secondResponse = await app.inject({
            method: METHOD,
            url: URL,
            headers,
            payload: BODY,
        });

        expect(secondResponse.statusCode).toBe(403);
        expect(secondResponse.json()).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Duplicate or replayed request detected',
            response: false,
        });
    });
});
// endregion
