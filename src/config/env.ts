// region Imports
import { z } from 'zod';
import 'dotenv/config';

// endregion

// region Schema
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    AUTH_SIGNATURE: z.string().min(1, 'AUTH_SIGNATURE is required'),
});
// endregion

// region Parse process.env once at boot, failing fast on invalid config
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
// endregion
