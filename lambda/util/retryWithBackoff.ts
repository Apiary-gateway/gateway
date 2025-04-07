import { config } from "./config/config";

export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = config.routing.retries || 3,
    delayMs = 1000
  ): Promise<T> {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt > retries) {
          throw err;
        }
        console.warn(`Retrying (${attempt}/${retries}) after error:`, err);
        await new Promise(res => setTimeout(res, delayMs * attempt));
      }
    }
    throw new Error("Unreachable");
  }
  