// region Imports
import type { FastifyReply, FastifyRequest } from 'fastify';

// Import Schema
import type { HmacBody } from '../../schemas/user/userSchema';

// Import Utils
import {
    createResponse,
    getRequestTiming,
    DEFAULT_SUCCESS_STATUS,
    DEFAULT_SUCCESS_STATUS_CODE,
} from '../../utils';

// endregion

// region Handler to Check the API with HMAC
export const checkWithHmac = async (request: FastifyRequest, reply: FastifyReply) => {
    // fastify-type-provider-zod infers `body` from the route's schema only when the
    // handler is declared inline at the route call site; a handler passed by reference
    // from a separate file (as here) resolves to `unknown`, so this cast is the boundary
    // where the route's already-validated Zod contract is asserted back onto the value.
    const body = request?.body as HmacBody;

    const response = createResponse(
        DEFAULT_SUCCESS_STATUS_CODE,
        DEFAULT_SUCCESS_STATUS,
        'Request processed successfully with HMAC authentication',
        {
            payload: body,
            timing: getRequestTiming(request),
        },
    );

    return reply.status(DEFAULT_SUCCESS_STATUS_CODE).send(response);
};
// endregion

// region Handler to Check the API without HMAC
export const checkWithOutHmac = async (request: FastifyRequest, reply: FastifyReply) => {
    // fastify-type-provider-zod infers `body` from the route's schema only when the
    // handler is declared inline at the route call site; a handler passed by reference
    // from a separate file (as here) resolves to `unknown`, so this cast is the boundary
    // where the route's already-validated Zod contract is asserted back onto the value.
    const body = request?.body as HmacBody;

    const response = createResponse(
        DEFAULT_SUCCESS_STATUS_CODE,
        DEFAULT_SUCCESS_STATUS,
        'Request processed successfully without HMAC authentication',
        {
            payload: body,
            timing: getRequestTiming(request),
        },
    );

    return reply.status(DEFAULT_SUCCESS_STATUS_CODE).send(response);
};
// endregion
