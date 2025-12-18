import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { Mutex } from "./mutex";
import { redis } from "./redis";

describe("Mutex Service", () => {
    afterAll(async () => {
        // Cleanup locks
        const keys = await redis.keys("mutex:test_*");
        if (keys.length > 0) await redis.del(...keys);
    });

    test("should acquire lock successfully", async () => {
        const mutex = new Mutex("test_lock_1", 10);
        const acquired = await mutex.tryAcquire();
        expect(acquired).toBe(true);
        await mutex.release();
    });

    test("should fail to acquire already held lock", async () => {
        const mutex1 = new Mutex("test_lock_2", 10);
        const mutex2 = new Mutex("test_lock_2", 10);

        await mutex1.tryAcquire();
        const acquired = await mutex2.tryAcquire();
        
        expect(acquired).toBe(false);
        await mutex1.release();
    });

    test("should release lock and allow re-acquisition", async () => {
        const mutex = new Mutex("test_lock_3", 10);
        
        await mutex.tryAcquire();
        await mutex.release();
        
        const reacquired = await mutex.tryAcquire();
        expect(reacquired).toBe(true);
        await mutex.release();
    });

    test("runExclusive should execute and release", async () => {
        const mutex = new Mutex("test_lock_4", 10);
        let executed = false;

        await mutex.runExclusive(async () => {
            executed = true;
        });

        expect(executed).toBe(true);
        
        // Lock should be free now
        const canAcquire = await mutex.tryAcquire();
        expect(canAcquire).toBe(true);
        await mutex.release();
    });
});
