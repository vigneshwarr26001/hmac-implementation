import { describe, it, expect } from 'vitest';
import { hashBody, buildCanonicalMessage, computeSignature } from '../../src/utils/hmac';

describe('hashBody', () => {
    it('is deterministic for the same input', () => {
        const body = { a: 1, b: 'two' };
        expect(hashBody(body)).toBe(hashBody(body));
        expect(hashBody({ a: 1, b: 'two' })).toBe(hashBody({ a: 1, b: 'two' }));
    });

    it('differs for different input', () => {
        expect(hashBody({ a: 1 })).not.toBe(hashBody({ a: 2 }));
        expect(hashBody({ a: 1 })).not.toBe(hashBody({}));
    });

    it('treats undefined/null the same as {}', () => {
        expect(hashBody(undefined)).toBe(hashBody({}));
        expect(hashBody(null)).toBe(hashBody({}));
    });
});

describe('buildCanonicalMessage', () => {
    it('joins method, url, timestamp, and body hash with "." in exact format', () => {
        expect(buildCanonicalMessage('POST', '/x', '123', 'abc')).toBe('POST./x.123.abc');
    });

    it('preserves query strings embedded in the url segment', () => {
        expect(buildCanonicalMessage('GET', '/user/withHmac?x=1', '456', 'deadbeef')).toBe(
            'GET./user/withHmac?x=1.456.deadbeef',
        );
    });
});

describe('computeSignature', () => {
    const secret = 'test-only-secret-do-not-use-in-production';
    const message = 'POST./user/withHmac.123.abc';

    it('is deterministic for the same (secret, message)', () => {
        expect(computeSignature(secret, message)).toBe(computeSignature(secret, message));
    });

    it('differs when the secret changes', () => {
        expect(computeSignature(secret, message)).not.toBe(
            computeSignature('a-different-secret', message),
        );
    });

    it('differs when the message changes', () => {
        expect(computeSignature(secret, message)).not.toBe(
            computeSignature(secret, 'POST./user/withHmac.999.abc'),
        );
    });

    it('produces a 64-character hex-encoded HMAC-SHA256 digest', () => {
        const signature = computeSignature(secret, message);
        expect(signature).toMatch(/^[0-9a-f]{64}$/);
    });
});
