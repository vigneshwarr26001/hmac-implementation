import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app';
import { signRequest } from '../helpers/signRequest';

// region Suite
// authenticateHmac.ts reads request.headers['x-hmac'] / ['x-hmac-timestamp'].
// Node's HTTP header handling (and light-my-request's mock request, which
// explicitly lowercases every header field name it's given -- see
// node_modules/light-my-request/lib/request.js) normalizes header names to
// lowercase regardless of how the client sent them. A client sending
// 'X-Hmac' / 'X-Hmac-Timestamp' must be authenticated exactly the same as one
// sending the lowercase form.
describe('POST /user/withHmac - header name case insensitivity', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await buildApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it('succeeds when the auth headers are sent in mixed case', async () => {
        const METHOD = 'POST';
        const URL = '/user/withHmac';
        const BODY = { hello: 'world' };
        const { signature, timestamp } = signRequest(METHOD, URL, BODY);

        const response = await app.inject({
            method: METHOD,
            url: URL,
            headers: {
                'X-Hmac': signature,
                'X-Hmac-Timestamp': timestamp,
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
