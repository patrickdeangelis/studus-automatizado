import { describe, expect, test } from "bun:test";
import { TaskType, TaskStatus } from "../src/index";

describe("Shared Types", () => {
    test("should have correct task types", () => {
        const type: TaskType = "SYNC_DISCIPLINES";
        expect(type).toBe("SYNC_DISCIPLINES");
    });

    test("should have correct status types", () => {
        const status: TaskStatus = "COMPLETED";
        expect(status).toBe("COMPLETED");
    });
});
