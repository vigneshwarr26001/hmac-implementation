// region Imports
import type { FastifyPluginAsync } from 'fastify';

// endregion

// region Routes
// Unauthenticated liveness check, consumed by the Dockerfile HEALTHCHECK and any
// container orchestrator's liveness probe.
const healthRouter: FastifyPluginAsync = async (fastify) => {
    fastify.get('/health', async () => ({ status: 'ok' }));
};
// endregion

// region Exports
export default healthRouter;
// endregion
