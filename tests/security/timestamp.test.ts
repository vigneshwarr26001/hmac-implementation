import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app';
import { signRequest } from '../helpers/signRequest';

// region Suite
// authenticateHmac.ts's timestamp check:
//   if (!requestTime || Math.abs(now - requestTime) > TIMESTAMP_TOLERANCE_MS) { ... 'Request Time expired' }
// with TIMESTAMP_TOLERANCE_MS = 60_000. Math.abs makes the check symmetric: a
// timestamp too far in the past AND one too far in the future are both rejected.
// Each case below signs a matching signature for the exact (skewed) timestamp it
// sends, so the timestamp check -- not the signature check -- is what's isolated.
describe('POST /user/withHmac - timestamp tolerance window', () => {
    let app: FastifyInstance;

    const METHOD = 'POST';
    const URL = '/user/withHmac';
    const BODY = { orderId: 'TS-1' };

    beforeAll(async () => {
        app = await buildApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it('rejects a correctly-signed request whose timestamp is 61000ms in the past', async () => {
        const pastTimestamp = (Date.now() - 61_000).toString();
        const { signature, timestamp } = signRequest(METHOD, URL, BODY, pastTimestamp);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': signature,
                'x-hmac-timestamp': timestamp,
            },
            payload: BODY,
        });

        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Request Time expired',
            response: false,
        });
    });

    it('rejects a correctly-signed request whose timestamp is 61000ms in the future', async () => {
        const futureTimestamp = (Date.now() + 61_000).toString();
        const { signature, timestamp } = signRequest(METHOD, URL, BODY, futureTimestamp);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': signature,
                'x-hmac-timestamp': timestamp,
            },
            payload: BODY,
        });

        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Request Time expired',
            response: false,
        });
    });

    it('accepts a correctly-signed request whose timestamp is only 30000ms old', async () => {
        const recentTimestamp = (Date.now() - 30_000).toString();
        const { signature, timestamp } = signRequest(METHOD, URL, BODY, recentTimestamp);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': signature,
                'x-hmac-timestamp': timestamp,
            },
            payload: BODY,
        });

        expect(response.statusCode).toBe(200);
        const json = response.json();
        expect(json.statusCode).toBe(200);
        expect(json.status).toBe('Success');
        expect(json.message).toBe('Request processed successfully with HMAC authentication');
        expect(json.response.payload).toEqual(BODY);
    });
});
// endregion
