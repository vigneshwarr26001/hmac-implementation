// region Imports
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

// Import Middleware
import { authenticateHmac, requestTimer } from '../../middleware';

// Import Controller
import { checkWithHmac, checkWithOutHmac } from '../../controller/user/userController';

// Import Schema
import { bodySchema, successResponseSchema } from '../../schemas/user/userSchema';

// endregion

// region Routes
const userRouter: FastifyPluginAsync = async (fastify) => {
    // onRequest is the earliest lifecycle stage — registered once here (plugin-scoped)
    // rather than per-route, so it captures true request-arrival time for both routes.
    fastify.addHook('onRequest', requestTimer);

    const app = fastify.withTypeProvider<ZodTypeProvider>();

    app.post('/withHmac', {
        schema: {
            body: bodySchema,
            response: { 200: successResponseSchema },
        },
        // preValidation runs after body parsing (so the body is still available to
        // hash) but before Zod's schema Validation stage — authentication gates the
        // request before any shape-validation work is done, not after.
        preValidation: [authenticateHmac],
    }, checkWithHmac);

    app.post('/withOutHmac', {
        schema: {
            body: bodySchema,
            response: { 200: successResponseSchema },
        },
    }, checkWithOutHmac);
};
// endregion

// region Exports
export default userRouter;
// endregion
