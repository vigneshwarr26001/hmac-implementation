// region Imports
import type { FastifyInstance } from 'fastify';
import userRouter from './user/userRouter';
import healthRouter from './health/healthRouter';

// endregion

// region Function to Register Route Plugins
export const registerRoutes = async (fastify: FastifyInstance) => {
    await fastify.register(healthRouter);
    await fastify.register(userRouter, { prefix: '/user' });
};
// endregion
