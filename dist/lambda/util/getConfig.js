"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initConfig = initConfig;
exports.getConfig = getConfig;
const client_s3_1 = require("@aws-sdk/client-s3");
const config_json_1 = __importDefault(require("./defaultConfig/config.json"));
const s3 = new client_s3_1.S3Client({});
const bucket = process.env.CONFIG_BUCKET_NAME;
let cachedConfig = null;
async function streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}
async function initConfig() {
    // if (cachedConfig) return; // commenting this out for now so we can test
    try {
        const key = `configs/config.json`;
        const { Body } = await s3.send(new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: key }));
        const config = JSON.parse(await streamToString(Body));
        if (!isValidConfig(config)) {
            throw new Error('Invalid config structure');
        }
        cachedConfig = config;
    }
    catch (error) {
        console.warn('Failed to load config from S3, using defaults:', error);
        if (!isValidConfig(config_json_1.default)) {
            throw new Error('Invalid default config structure');
        }
        cachedConfig = config_json_1.default;
    }
}
function isValidConfig(config) {
    if (!config || typeof config !== 'object')
        return false;
    const requiredKeys = ['routing', 'guardrails', 'cache'];
    return requiredKeys.every(key => key in config);
}
function getConfig() {
    if (!cachedConfig) {
        throw new Error('Config not initialized. You must call initConfig() first.');
    }
    return cachedConfig;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0Q29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGFtYmRhL3V0aWwvZ2V0Q29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBaUJBLGdDQW9CQztBQVNELDhCQU1DO0FBcERELGtEQUFnRTtBQUdoRSw4RUFBd0Q7QUFFeEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzVCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQW1CLENBQUM7QUFDL0MsSUFBSSxZQUFZLEdBQWtCLElBQUksQ0FBQztBQUV2QyxLQUFLLFVBQVUsY0FBYyxDQUFDLE1BQWdCO0lBQzFDLE1BQU0sTUFBTSxHQUFpQixFQUFFLENBQUM7SUFDaEMsSUFBSSxLQUFLLEVBQUUsTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7UUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ25ELENBQUM7QUFFTSxLQUFLLFVBQVUsVUFBVTtJQUM1QiwwRUFBMEU7SUFFMUUsSUFBSSxDQUFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUM7UUFDbEMsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLDRCQUFnQixDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxjQUFjLENBQUMsSUFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFFbEUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBRUQsWUFBWSxHQUFHLE1BQU0sQ0FBQztJQUMxQixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0RBQWdELEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBYSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUNELFlBQVksR0FBRyxxQkFBYSxDQUFDO0lBQ2pDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsTUFBZTtJQUNsQyxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVE7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUV4RCxNQUFNLFlBQVksR0FBRyxDQUFDLFNBQVMsRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDeEQsT0FBTyxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFDO0FBQ3BELENBQUM7QUFFRCxTQUFnQixTQUFTO0lBQ3JCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7SUFDakYsQ0FBQztJQUVELE9BQU8sWUFBWSxDQUFDO0FBQ3hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTM0NsaWVudCwgR2V0T2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XG5pbXBvcnQgeyBSZWFkYWJsZSB9IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBkZWZhdWx0Q29uZmlnIGZyb20gJy4vZGVmYXVsdENvbmZpZy9jb25maWcuanNvbic7XG5cbmNvbnN0IHMzID0gbmV3IFMzQ2xpZW50KHt9KTtcbmNvbnN0IGJ1Y2tldCA9IHByb2Nlc3MuZW52LkNPTkZJR19CVUNLRVRfTkFNRSE7XG5sZXQgY2FjaGVkQ29uZmlnOiBDb25maWcgfCBudWxsID0gbnVsbDtcblxuYXN5bmMgZnVuY3Rpb24gc3RyZWFtVG9TdHJpbmcoc3RyZWFtOiBSZWFkYWJsZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgY2h1bmtzOiBVaW50OEFycmF5W10gPSBbXTtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IGNodW5rIG9mIHN0cmVhbSkge1xuICAgICAgICBjaHVua3MucHVzaCh0eXBlb2YgY2h1bmsgPT09ICdzdHJpbmcnID8gQnVmZmVyLmZyb20oY2h1bmspIDogY2h1bmspO1xuICAgIH1cbiAgICByZXR1cm4gQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGYtOCcpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdENvbmZpZygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBpZiAoY2FjaGVkQ29uZmlnKSByZXR1cm47IC8vIGNvbW1lbnRpbmcgdGhpcyBvdXQgZm9yIG5vdyBzbyB3ZSBjYW4gdGVzdFxuXG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3Qga2V5ID0gYGNvbmZpZ3MvY29uZmlnLmpzb25gO1xuICAgICAgICBjb25zdCB7IEJvZHkgfSA9IGF3YWl0IHMzLnNlbmQobmV3IEdldE9iamVjdENvbW1hbmQoeyBCdWNrZXQ6IGJ1Y2tldCwgS2V5OiBrZXkgfSkpO1xuICAgICAgICBjb25zdCBjb25maWcgPSBKU09OLnBhcnNlKGF3YWl0IHN0cmVhbVRvU3RyaW5nKEJvZHkgYXMgUmVhZGFibGUpKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghaXNWYWxpZENvbmZpZyhjb25maWcpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29uZmlnIHN0cnVjdHVyZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FjaGVkQ29uZmlnID0gY29uZmlnO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvYWQgY29uZmlnIGZyb20gUzMsIHVzaW5nIGRlZmF1bHRzOicsIGVycm9yKTtcbiAgICAgICAgaWYgKCFpc1ZhbGlkQ29uZmlnKGRlZmF1bHRDb25maWcpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZGVmYXVsdCBjb25maWcgc3RydWN0dXJlJyk7XG4gICAgICAgIH1cbiAgICAgICAgY2FjaGVkQ29uZmlnID0gZGVmYXVsdENvbmZpZztcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWRDb25maWcoY29uZmlnOiB1bmtub3duKTogY29uZmlnIGlzIENvbmZpZyB7XG4gICAgaWYgKCFjb25maWcgfHwgdHlwZW9mIGNvbmZpZyAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IHJlcXVpcmVkS2V5cyA9IFsncm91dGluZycsICdndWFyZHJhaWxzJywgJ2NhY2hlJ107XG4gICAgcmV0dXJuIHJlcXVpcmVkS2V5cy5ldmVyeShrZXkgPT4ga2V5IGluIGNvbmZpZyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWcoKTogQ29uZmlnIHtcbiAgICBpZiAoIWNhY2hlZENvbmZpZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZyBub3QgaW5pdGlhbGl6ZWQuIFlvdSBtdXN0IGNhbGwgaW5pdENvbmZpZygpIGZpcnN0LicpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gY2FjaGVkQ29uZmlnO1xufVxuIl19