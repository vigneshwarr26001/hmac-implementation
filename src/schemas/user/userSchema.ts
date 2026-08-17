// region Imports
import { z } from 'zod';

// endregion

// region Request Body Schema
// Payload is passed through as-is (hashed for HMAC / echoed back), so only the
// shape (a JSON object) is enforced; an absent body defaults to {}.
export const bodySchema = z.record(z.string(), z.unknown()).default({});

export type HmacBody = z.infer<typeof bodySchema>;
// endregion

// region Success Response Schema
const timingSchema = z.object({
    requestReceivedAt: z.string(),
    responseSentAt: z.string(),
    processingTimeMs: z.number(),
});

export const successResponseSchema = z.object({
    statusCode: z.literal(200),
    status: z.literal('Success'),
    message: z.string(),
    response: z.object({
        payload: z.unknown(),
        timing: timingSchema,
    }),
});
// endregion
