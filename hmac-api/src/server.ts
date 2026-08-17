// region Imports
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import { env } from './config/env';

// endregion

// region Constants
const SHUTDOWN_TIMEOUT_MS = 10_000;
// endregion

// region Function to Register Shutdown/Crash Handlers
const registerShutdownHandlers = (app: FastifyInstance) => {
    let shuttingDown = false;

    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;

        app.log.info(`Received ${signal}, shutting down gracefully`);

        const forceExit = setTimeout(() => {
            app.log.error('Graceful shutdown timed out, forcing exit');
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);

        try {
            await app.close();
            clearTimeout(forceExit);
            process.exit(0);
        } catch (error) {
            app.log.error({ error }, 'Error during shutdown');
            clearTimeout(forceExit);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
        app.log.error({ error }, 'Uncaught exception');
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        app.log.error({ reason }, 'Unhandled promise rejection');
        process.exit(1);
    });
};
// endregion

// region Function to Start the Server
const startServer = async () => {
    try {
        const app = await buildApp();

        registerShutdownHandlers(app);

        // Bind to all interfaces (matches Express's default) so the port is
        // reachable from outside the container — Fastify defaults to 127.0.0.1 otherwise.
        await app.listen({ port: env.PORT, host: '0.0.0.0' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to start server:', message);
        process.exit(1);
    }
};
// endregion

startServer();
