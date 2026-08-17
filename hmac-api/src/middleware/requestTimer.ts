// region Imports
import type { FastifyReply, FastifyRequest } from 'fastify';

// endregion

// region Hook to Capture Request Start Time
export const requestTimer = async (request: FastifyRequest, _reply: FastifyReply) => {
    request.requestReceivedAt = Date.now();
    request.requestStartHrTime = process.hrtime.bigint();
};
// endregion
