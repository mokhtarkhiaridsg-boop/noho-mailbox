import { beforeAll, afterAll } from "vitest";

// Silence console.error for expected errors in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    if (
      msg.includes("Warning:") ||
      msg.includes("act(") ||
      msg.includes("ReactDOM.render")
    ) return;
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});
