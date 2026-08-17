import { describe, it, expect, vi } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { createResponse, getRequestTiming } from '../../src/utils/commonFunction';

describe('createResponse', () => {
    it('defaults response to [] when omitted', () => {
        const result = createResponse(200, 'Success', 'ok');

        expect(result).toEqual({
            statusCode: 200,
            status: 'Success',
            message: 'ok',
            response: [],
        });
    });

    it('sets all 4 fields correctly when response is provided', () => {
        const payload = { foo: 'bar', count: 3 };
        const result = createResponse(400, 'Failure', 'Request validation failed', payload);

        expect(result).toEqual({
            statusCode: 400,
            status: 'Failure',
            message: 'Request validation failed',
            response: payload,
        });
    });

    it('preserves distinct statusCode/status/message combinations', () => {
        const result = createResponse(403, 'Failure', 'Signature Authentication failed');

        expect(result.statusCode).toBe(403);
        expect(result.status).toBe('Failure');
        expect(result.message).toBe('Signature Authentication failed');
        expect(result.response).toEqual([]);
    });
});

describe('getRequestTiming', () => {
    const makeFakeRequest = (
        requestReceivedAt: number,
        requestStartHrTime: bigint,
    ): FastifyRequest =>
        ({
            requestReceivedAt,
            requestStartHrTime,
        }) as unknown as FastifyRequest;

    it('returns ISO string timestamps and a non-negative processingTimeMs', () => {
        const requestReceivedAt = Date.now();
        const requestStartHrTime = process.hrtime.bigint();

        const timing = getRequestTiming(makeFakeRequest(requestReceivedAt, requestStartHrTime));

        // Valid ISO 8601 strings.
        expect(() => new Date(timing.requestReceivedAt).toISOString()).not.toThrow();
        expect(new Date(timing.requestReceivedAt).toISOString()).toBe(timing.requestReceivedAt);
        expect(() => new Date(timing.responseSentAt).toISOString()).not.toThrow();
        expect(new Date(timing.responseSentAt).toISOString()).toBe(timing.responseSentAt);

        expect(typeof timing.processingTimeMs).toBe('number');
        expect(timing.processingTimeMs).toBeGreaterThanOrEqual(0);
        expect(Number.isNaN(timing.processingTimeMs)).toBe(false);
    });

    it('derives responseSentAt from requestReceivedAt + processingTimeMs', () => {
        const requestReceivedAt = Date.now();
        const requestStartHrTime = process.hrtime.bigint();

        const timing = getRequestTiming(makeFakeRequest(requestReceivedAt, requestStartHrTime));

        const expectedResponseSentAt = new Date(
            requestReceivedAt + timing.processingTimeMs,
        ).toISOString();
        expect(timing.responseSentAt).toBe(expectedResponseSentAt);
        expect(new Date(timing.responseSentAt).getTime()).toBeGreaterThanOrEqual(
            new Date(timing.requestReceivedAt).getTime(),
        );
    });

    it('computes processingTimeMs deterministically from the hrtime delta', () => {
        const requestReceivedAt = 1_700_000_000_000;
        const startHrTime = 100_000_000_000n; // 100,000,000,000 ns
        const endHrTime = startHrTime + 5_500_000n; // +5.5ms in ns

        const bigintSpy = vi.spyOn(process.hrtime, 'bigint').mockReturnValueOnce(endHrTime);

        const timing = getRequestTiming(makeFakeRequest(requestReceivedAt, startHrTime));

        expect(timing.processingTimeMs).toBeCloseTo(5.5, 4);
        expect(timing.requestReceivedAt).toBe(new Date(requestReceivedAt).toISOString());
        expect(timing.responseSentAt).toBe(
            new Date(requestReceivedAt + timing.processingTimeMs).toISOString(),
        );

        bigintSpy.mockRestore();
    });
});
