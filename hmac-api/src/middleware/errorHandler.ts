// region Imports
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

// Import Utils
import {
    createResponse,
    DEFAULT_FAILURE_STATUS_CODE,
    DEFAULT_FAILURE_STATUS,
    DEFAULT_ERROR_MESSAGE,
} from '../utils';

// endregion

// region Common Error Handler
export const errorHandler = async (err: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = err.statusCode || DEFAULT_FAILURE_STATUS_CODE;

    // Log the real error server-side; the client only ever sees a sanitized message
    request.log.error({ err, statusCode }, 'unhandled error');

    // Zod/schema validation failures get a more specific (still safe) message
    const message = err.validation ? 'Request validation failed' : DEFAULT_ERROR_MESSAGE;

    const response = createResponse(statusCode, DEFAULT_FAILURE_STATUS, message);
    return reply.status(statusCode).send(response);
};
// endregion
