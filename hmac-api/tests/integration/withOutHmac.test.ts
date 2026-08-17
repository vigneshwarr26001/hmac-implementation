import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../src/app';

describe('POST /user/withOutHmac', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('echoes the request body and returns the unauthenticated success envelope', async () => {
        const requestBody = {
            name: 'Alice',
            age: 30,
            nested: { active: true, tags: ['a', 'b'] },
        };

        const response = await app.inject({
            method: 'POST',
            url: '/user/withOutHmac',
            payload: requestBody,
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.statusCode).toBe(200);
        expect(body.status).toBe('Success');
        // Exact string from checkWithOutHmac in userController.ts.
        expect(body.message).toBe('Request processed successfully without HMAC authentication');

        expect(body.response.payload).toEqual(requestBody);

        const { timing } = body.response;
        expect(typeof timing.requestReceivedAt).toBe('string');
        expect(typeof timing.responseSentAt).toBe('string');
        expect(typeof timing.processingTimeMs).toBe('number');

        // requestReceivedAt / responseSentAt must be valid ISO-8601 timestamps (getRequestTiming
        // builds them via `new Date(...).toISOString()`).
        expect(new Date(timing.requestReceivedAt).toISOString()).toBe(timing.requestReceivedAt);
        expect(new Date(timing.responseSentAt).toISOString()).toBe(timing.responseSentAt);

        // responseSentAt = requestReceivedAt + processingTimeMs, so it can never be earlier.
        expect(Date.parse(timing.responseSentAt)).toBeGreaterThanOrEqual(Date.parse(timing.requestReceivedAt));
        expect(timing.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('defaults the payload to {} when the body is an empty JSON object', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/user/withOutHmac',
            payload: {},
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();
        expect(body.statusCode).toBe(200);
        expect(body.status).toBe('Success');
        expect(body.message).toBe('Request processed successfully without HMAC authentication');
        expect(body.response.payload).toEqual({});
    });

    // NOTE: this is the empirically-verified behavior of this exact stack (Fastify 5's built-in
    // JSON content-type parser + Zod's z.record(...).default({})) -- not an assumption. A request
    // sent with genuinely no body at all (no payload bytes, no content-type) is parsed by
    // Fastify's default JSON parser as the literal value `null` (its documented handling of an
    // empty body), and Zod's `.default()` only substitutes when the input is `undefined`, so
    // `null` fails the `z.record` object-shape check with a validation error instead of being
    // defaulted to `{}`. Confirmed via app.inject({ method: 'POST', url: '/user/withOutHmac' })
    // against the real, running app: it returns 400 with message 'Request validation failed',
    // not 200 with payload {}.
    it('rejects a request with no body at all as a schema validation failure (400), because an absent body parses to `null`, not `undefined`', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/user/withOutHmac',
        });

        expect(response.statusCode).toBe(400);

        const body = response.json();
        expect(body.statusCode).toBe(400);
        expect(body.status).toBe('Failure');
        expect(body.message).toBe('Request validation failed');
        expect(body.response).toEqual([]);
    });
});
