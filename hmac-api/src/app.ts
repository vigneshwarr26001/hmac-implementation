// region Imports
// Import Packages
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

// Import Config
import { env } from './config/env';

// Import Routes
import { registerRoutes } from './routes';

// Import Middleware
import { errorHandler } from './middleware';

// Import Utils
import { createResponse, DEFAULT_FAILURE_STATUS } from './utils';

// endregion

// region Function to Build the Fastify App
export const buildApp = async () => {
    const app = Fastify({
        bodyLimit: 10 * 1024 * 1024,
        logger: {
            level: env.NODE_ENV === 'production' ? 'info' : env.NODE_ENV === 'test' ? 'silent' : 'debug',
            redact: {
                paths: ['req.headers["x-hmac"]', 'req.headers["x-hmac-timestamp"]', 'req.headers.authorization'],
                remove: true,
            },
        },
    });

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // Fastify snapshots compilers/error handler onto each child context at
    // register() time, so these must be set before routes are registered —
    // the reverse of Express, where error middleware has to come last.
    app.setErrorHandler(errorHandler);

    app.setNotFoundHandler((_request, reply) => {
        return reply.status(404).send(createResponse(404, DEFAULT_FAILURE_STATUS, 'Route not found', false));
    });

    await app.register(cors);

    // Assign Route's Path
    await registerRoutes(app);

    return app;
};
// endregion
