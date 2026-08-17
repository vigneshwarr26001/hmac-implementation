import { describe, it, expect } from 'vitest';
import { bodySchema, successResponseSchema } from '../../src/schemas/user/userSchema';

describe('bodySchema', () => {
    it('parses undefined as {}', () => {
        expect(bodySchema.parse(undefined)).toEqual({});
    });

    it('parses {} as {}', () => {
        expect(bodySchema.parse({})).toEqual({});
    });

    it('passes an arbitrary object through unchanged', () => {
        expect(bodySchema.parse({ a: 1 })).toEqual({ a: 1 });
    });

    it('rejects an array', () => {
        expect(bodySchema.safeParse([1, 2, 3]).success).toBe(false);
    });

    it('rejects a string', () => {
        expect(bodySchema.safeParse('a string').success).toBe(false);
    });

    it('rejects a number', () => {
        expect(bodySchema.safeParse(42).success).toBe(false);
    });

    it('rejects null', () => {
        expect(bodySchema.safeParse(null).success).toBe(false);
    });
});

describe('successResponseSchema', () => {
    it('parses a valid success response shape', () => {
        const valid = {
            statusCode: 200,
            status: 'Success',
            message: 'checkWithHmac executed successfully',
            response: {
                payload: { foo: 'bar' },
                timing: {
                    requestReceivedAt: new Date().toISOString(),
                    responseSentAt: new Date().toISOString(),
                    processingTimeMs: 1.2345,
                },
            },
        };

        const result = successResponseSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it('rejects a response with the wrong statusCode literal', () => {
        const invalid = {
            statusCode: 201,
            status: 'Success',
            message: 'nope',
            response: {
                payload: {},
                timing: {
                    requestReceivedAt: new Date().toISOString(),
                    responseSentAt: new Date().toISOString(),
                    processingTimeMs: 0,
                },
            },
        };

        expect(successResponseSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects a response missing response.timing', () => {
        const invalid = {
            statusCode: 200,
            status: 'Success',
            message: 'nope',
            response: {
                payload: {},
            },
        };

        expect(successResponseSchema.safeParse(invalid).success).toBe(false);
    });
});
