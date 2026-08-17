// region Imports
import type { FastifyRequest } from 'fastify';

// endregion

// region Helper Function for standardized API responses
export const createResponse = (
    statusCode: number,
    status: string,
    message: string,
    response: unknown = [],
) => ({
    statusCode,
    status,
    message,
    response,
});
// endregion

// region Helper Function to Build Timing Details for a Request
export const getRequestTiming = (request: FastifyRequest) => {
    const requestReceivedAt = request?.requestReceivedAt;

    // Date.now() only has 1ms resolution, so for sub-millisecond requests it can
    // report the same value for both start and end. Derive the end time from the
    // high-resolution elapsed duration instead, so the two timestamps always agree
    // with processingTimeMs.
    const processingTimeMs = Number(
        (Number(process.hrtime.bigint() - request?.requestStartHrTime) / 1e6).toFixed(4)
    );
    const responseSentAt = requestReceivedAt + processingTimeMs;

    return {
        requestReceivedAt: new Date(requestReceivedAt).toISOString(),
        responseSentAt: new Date(responseSentAt).toISOString(),
        processingTimeMs,
    };
};
// endregion
