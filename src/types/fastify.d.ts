import 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        requestReceivedAt: number;
        requestStartHrTime: bigint;
    }
}
