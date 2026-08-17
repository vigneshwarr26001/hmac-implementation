import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../src/app';

describe('error handling', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('unknown routes (app.setNotFoundHandler in app.ts)', () => {
        it('GET on an unregistered route returns the exact 404 envelope', async () => {
            const response = await app.inject({ method: 'GET', url: '/nope' });

            expect(response.statusCode).toBe(404);
            // setNotFoundHandler calls createResponse(404, DEFAULT_FAILURE_STATUS, 'Route not
            // found', false) -- the 4th arg is `false`, not the usual [] default, so `response`
            // must be exactly `false` here.
            expect(response.json()).toEqual({
                statusCode: 404,
                status: 'Failure',
                message: 'Route not found',
                response: false,
            });
        });

        it('POST on an unregistered route returns the same 404 envelope (the handler is method-agnostic)', async () => {
            const response = await app.inject({ method: 'POST', url: '/nope' });

            expect(response.statusCode).toBe(404);
            expect(response.json()).toEqual({
                statusCode: 404,
                status: 'Failure',
                message: 'Route not found',
                response: false,
            });
        });
    });

    describe('schema validation failures (errorHandler.ts: err.validation set)', () => {
        it('rejects a JSON array body with 400 and "Request validation failed"', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/user/withOutHmac',
                payload: [1, 2, 3],
            });

            expect(response.statusCode).toBe(400);

            const body = response.json();
            expect(body.statusCode).toBe(400);
            expect(body.status).toBe('Failure');
            expect(body.message).toBe('Request validation failed');
            expect(body.response).toEqual([]);
        });

        it('rejects a bare JSON string body with 400 and "Request validation failed"', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/user/withOutHmac',
                payload: JSON.stringify('just a string'),
                headers: { 'content-type': 'application/json' },
            });

            expect(response.statusCode).toBe(400);

            const body = response.json();
            expect(body.statusCode).toBe(400);
            expect(body.status).toBe('Failure');
            expect(body.message).toBe('Request validation failed');
            expect(body.response).toEqual([]);
        });
    });

    describe('body size limit (Fastify bodyLimit: 10 * 1024 * 1024 in app.ts)', () => {
        it('rejects a payload above the 10MB bodyLimit through the app\'s own error envelope, not a raw framework error', async () => {
            // 11MB of payload -- comfortably over the 10MB bodyLimit configured in app.ts.
            const oversizedString = 'x'.repeat(11 * 1024 * 1024);

            const response = await app.inject({
                method: 'POST',
                url: '/user/withOutHmac',
                payload: { big: oversizedString },
            });

            // Verified empirically against the real, running app (rather than assumed): Fastify's
            // own body-limit guard raises FST_ERR_CTP_BODY_TOO_LARGE with err.statusCode = 413,
            // which errorHandler.ts's `err.statusCode || DEFAULT_FAILURE_STATUS_CODE` uses
            // directly for the HTTP status. 413 is the real, exact status -- not merely "some
            // 4xx" -- but the range assertion below is kept as a documented fallback guard.
            expect(response.statusCode).toBe(413);
            expect(response.statusCode).toBeGreaterThanOrEqual(400);
            expect(response.statusCode).toBeLessThan(500);

            const body = response.json();
            // Comes back through createResponse (the app's own error envelope) -- same shape as
            // every other error response -- rather than a raw, unformatted Fastify/Node error.
            expect(body.statusCode).toBe(response.statusCode);
            expect(body.status).toBe('Failure');
            // err.validation is not set for a body-too-large error (it's a raw parsing/transport
            // error, not a Zod schema failure), so errorHandler.ts falls back to the generic
            // DEFAULT_ERROR_MESSAGE rather than 'Request validation failed'.
            expect(body.message).toBe('Error occurred. Please try again later.');
            expect(body.response).toEqual([]);
        });
    });
});
