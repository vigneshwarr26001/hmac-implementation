import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../src/app';

describe('GET /health', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('returns a raw { status: "ok" } liveness payload, not wrapped in the createResponse envelope', async () => {
        const response = await app.inject({ method: 'GET', url: '/health' });

        expect(response.statusCode).toBe(200);

        const body = response.json();
        // healthRouter.ts's handler returns `{ status: 'ok' }` directly -- it never calls
        // createResponse, so there is no statusCode/status/message/response envelope here.
        expect(body).toEqual({ status: 'ok' });
        expect(Object.keys(body)).toEqual(['status']);
    });
});
