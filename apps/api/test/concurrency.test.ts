import { describe, expect, test } from "bun:test";

const API_URL = "http://localhost:3000";

describe("Concurrency Control", () => {
  test("Should reject concurrent sync requests", async () => {
    console.log("🚀 Starting Concurrency Spam Test...");

    const requests = Array(10).fill(0).map((_, i) => 
      fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SYNC_DISCIPLINES", payload: { id: i } }),
      })
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);
    
    console.log("Statuses:", statuses);

    const successCount = statuses.filter(s => s === 200).length;
    const conflictCount = statuses.filter(s => s === 409).length;
    const lockedCount = statuses.filter(s => s === 429).length;

    console.log(`Success: ${successCount}, Conflicts: ${conflictCount}, Locked: ${lockedCount}`);

    // Expect AT MOST 1 success (or 0 if one was already running)
    expect(successCount).toBeLessThanOrEqual(1);
    
    // Expect the rest to be rejected
    expect(conflictCount + lockedCount).toBeGreaterThanOrEqual(9);
  });
});
