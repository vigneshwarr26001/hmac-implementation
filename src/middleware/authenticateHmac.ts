// region Imports
import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

// Import Config
import { env } from '../config/env';

// Import Utils
import {
    createResponse,
    DEFAULT_FAILURE_STATUS,
    DEFAULT_FORBIDDEN_STATUS_CODE,
    buildCanonicalMessage,
    computeSignature,
    hashBody,
} from '../utils';

// endregion

// region Constants
const TIMESTAMP_TOLERANCE_MS = 60_000;

// Only signatures that pass verification are cached, keyed by the signature itself.
// A margin beyond TIMESTAMP_TOLERANCE_MS covers clock skew between when the entry
// was recorded (relative to the request's own timestamp) and when it's checked.
const REPLAY_CACHE_TTL_MS = TIMESTAMP_TOLERANCE_MS * 2;
const seenSignatures = new Map<string, number>();
// endregion

// region Helpers
const deny = (reply: FastifyReply, message: string) =>
    reply.status(DEFAULT_FORBIDDEN_STATUS_CODE).send(
        createResponse(DEFAULT_FORBIDDEN_STATUS_CODE, DEFAULT_FAILURE_STATUS, message, false),
    );

const readHeader = (value: string | string[] | undefined): string =>
    typeof value === 'string' ? value : '';

// Sized for a single-instance deployment: an in-process Map is sufficient today.
// A horizontally-scaled deployment would need a shared store (e.g. Redis) instead.
const isReplay = (signature: string, now: number): boolean => {
    for (const [cachedSignature, expiresAt] of seenSignatures) {
        if (expiresAt <= now) {
            seenSignatures.delete(cachedSignature);
        }
    }

    if (seenSignatures.has(signature)) {
        return true;
    }

    seenSignatures.set(signature, now + REPLAY_CACHE_TTL_MS);
    return false;
};
// endregion

// region Hook to Authenticate the HMAC Signature
export const authenticateHmac = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const clientHmac = readHeader(request.headers['x-hmac']);
        const timestamp = readHeader(request.headers['x-hmac-timestamp']);

        // Check required params
        if (!clientHmac || !timestamp || isNaN(Number(timestamp))) {
            return deny(reply, 'Timestamp or Authentication Token Missing');
        }

        // Validate timestamp (1:00 mins tolerance)
        const now = Date.now();
        const requestTime = Number(timestamp);

        if (!requestTime || Math.abs(now - requestTime) > TIMESTAMP_TOLERANCE_MS) {
            return deny(reply, 'Request Time expired');
        }

        // Recreate the canonical message and expected signature
        const payloadHash = hashBody(request?.body);
        const message = buildCanonicalMessage(request.method, request.url, timestamp, payloadHash);
        const serverHmac = computeSignature(env.AUTH_SIGNATURE, message);

        // Server Generated HMAC and Client Generated HMAC not Valid
        if (serverHmac.length !== clientHmac.length) {
            return deny(reply, 'Invalid Authentication Signature Length');
        }

        // Secure compare (timing safe)
        const isValid = crypto.timingSafeEqual(
            Buffer.from(serverHmac, 'hex'),
            Buffer.from(clientHmac, 'hex'),
        );

        if (!isValid) {
            return deny(reply, 'Invalid Authentication Signature');
        }

        // Reject exact repeats of a previously-seen, already-verified signature
        if (isReplay(clientHmac, now)) {
            return deny(reply, 'Duplicate or replayed request detected');
        }
    } catch (error) {
        return deny(reply, 'Signature Authentication failed');
    }
};
// endregion
