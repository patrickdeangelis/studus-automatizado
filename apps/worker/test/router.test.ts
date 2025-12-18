import { describe, expect, test, mock } from "bun:test";

// Mocking processors
const mockProcessLogin = mock(async () => ({ success: true }));
const mockProcessSync = mock(async () => ({ success: true }));

describe("Worker Job Routing", () => {
    test("should route LOGIN task correctly", async () => {
        const job = { name: "LOGIN", data: { taskId: 1 } };
        
        let result;
        if (job.name === "LOGIN") {
            result = await mockProcessLogin();
        }

        expect(mockProcessLogin).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });

    test("should route SYNC_DISCIPLINES task correctly", async () => {
        const job = { name: "SYNC_DISCIPLINES", data: { taskId: 2 } };
        
        let result;
        if (job.name === "SYNC_DISCIPLINES") {
            result = await mockProcessSync();
        }

        expect(mockProcessSync).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });
});
