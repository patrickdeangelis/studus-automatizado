import { redis } from './redis';

export class Mutex {
    private key: string;
    private ttl: number;

    constructor(key: string, ttlSeconds: number = 5) {
        this.key = `mutex:${key}`;
        this.ttl = ttlSeconds;
    }

    /**
     * Tries to acquire the lock. Returns true if successful.
     */
    async tryAcquire(): Promise<boolean> {
        const result = await redis.set(this.key, 'locked', 'EX', this.ttl, 'NX');
        return result === 'OK';
    }

    /**
     * Releases the lock.
     */
    async release(): Promise<void> {
        await redis.del(this.key);
    }

    /**
     * Runs a function exclusively. Throws error if lock cannot be acquired.
     */
    async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
        const acquired = await this.tryAcquire();
        if (!acquired) {
            throw new Error('Could not acquire mutex lock');
        }
        try {
            return await fn();
        } finally {
            await this.release();
        }
    }
}
