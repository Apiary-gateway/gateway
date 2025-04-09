import { getConfig } from "./getConfig";

export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    delayMs = 1000
  ): Promise<T> {
    const config = getConfig();
    const retries = config.routing.retries;
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
  