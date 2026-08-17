import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app';
import { signRequest } from '../helpers/signRequest';

// region Suite
// Every case below hits authenticateHmac's very first guard clause:
//   if (!clientHmac || !timestamp || isNaN(Number(timestamp))) { ... 'Timestamp or Authentication Token Missing' }
// A correctly-signed pair is generated up front so each case can omit / corrupt
// exactly one header while leaving the other header's value realistic.
describe('POST /user/withHmac - missing/malformed auth headers', () => {
    let app: FastifyInstance;

    const METHOD = 'POST';
    const URL = '/user/withHmac';
    const BODY = { foo: 'bar' };

    beforeAll(async () => {
        app = await buildApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it('returns 403 "Timestamp or Authentication Token Missing" when x-hmac is missing', async () => {
        const { timestamp } = signRequest(METHOD, URL, BODY);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac-timestamp': timestamp,
            },
            payload: BODY,
        });

        expect(response.statusCode).toBe(403);
        const json = response.json();
        expect(json).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Timestamp or Authentication Token Missing',
            response: false,
        });
    });

    it('returns 403 "Timestamp or Authentication Token Missing" when x-hmac-timestamp is missing', async () => {
        const { signature } = signRequest(METHOD, URL, BODY);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': signature,
            },
            payload: BODY,
        });

        expect(response.statusCode).toBe(403);
        const json = response.json();
        expect(json).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Timestamp or Authentication Token Missing',
            response: false,
        });
    });

    it('returns 403 "Timestamp or Authentication Token Missing" when both headers are missing', async () => {
        const response = await app.inject({
            method: METHOD,
            url: URL,
            payload: BODY,
        });

        expect(response.statusCode).toBe(403);
        const json = response.json();
        expect(json).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Timestamp or Authentication Token Missing',
            response: false,
        });
    });

    it('returns 403 "Timestamp or Authentication Token Missing" when x-hmac-timestamp is non-numeric', async () => {
        const { signature } = signRequest(METHOD, URL, BODY);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'x-hmac': signature,
                'x-hmac-timestamp': 'not-a-number',
            },
            payload: BODY,
        });

        expect(response.statusCode).toBe(403);
        const json = response.json();
        expect(json).toEqual({
            statusCode: 403,
            status: 'Failure',
            message: 'Timestamp or Authentication Token Missing',
            response: false,
        });
    });
});
// endregion
