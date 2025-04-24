"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
const getConfig_1 = require("./getConfig");
async function retryWithBackoff(fn, delayMs = 1000) {
    const config = (0, getConfig_1.getConfig)();
    const retries = config.routing.retries;
    let attempt = 0;
    while (attempt <= retries) {
        try {
            return await fn();
        }
        catch (err) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmV0cnlXaXRoQmFja29mZi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xhbWJkYS91dGlsL3JldHJ5V2l0aEJhY2tvZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSw0Q0FvQkc7QUF0QkgsMkNBQXdDO0FBRWpDLEtBQUssVUFBVSxnQkFBZ0IsQ0FDbEMsRUFBb0IsRUFDcEIsT0FBTyxHQUFHLElBQUk7SUFFZCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFTLEdBQUUsQ0FBQztJQUMzQixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztJQUN2QyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFDaEIsT0FBTyxPQUFPLElBQUksT0FBTyxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDO1lBQ0gsT0FBTyxNQUFNLEVBQUUsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2IsT0FBTyxFQUFFLENBQUM7WUFDVixJQUFJLE9BQU8sR0FBRyxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxHQUFHLENBQUM7WUFDWixDQUFDO1lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLE9BQU8sSUFBSSxPQUFPLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLE9BQU8sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQy9ELENBQUM7SUFDSCxDQUFDO0lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZ2V0Q29uZmlnIH0gZnJvbSBcIi4vZ2V0Q29uZmlnXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXRyeVdpdGhCYWNrb2ZmPFQ+KFxuICAgIGZuOiAoKSA9PiBQcm9taXNlPFQ+LFxuICAgIGRlbGF5TXMgPSAxMDAwXG4gICk6IFByb21pc2U8VD4ge1xuICAgIGNvbnN0IGNvbmZpZyA9IGdldENvbmZpZygpO1xuICAgIGNvbnN0IHJldHJpZXMgPSBjb25maWcucm91dGluZy5yZXRyaWVzO1xuICAgIGxldCBhdHRlbXB0ID0gMDtcbiAgICB3aGlsZSAoYXR0ZW1wdCA8PSByZXRyaWVzKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gYXdhaXQgZm4oKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBhdHRlbXB0Kys7XG4gICAgICAgIGlmIChhdHRlbXB0ID4gcmV0cmllcykge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLndhcm4oYFJldHJ5aW5nICgke2F0dGVtcHR9LyR7cmV0cmllc30pIGFmdGVyIGVycm9yOmAsIGVycik7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlcyA9PiBzZXRUaW1lb3V0KHJlcywgZGVsYXlNcyAqIGF0dGVtcHQpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVW5yZWFjaGFibGVcIik7XG4gIH1cbiAgIl19