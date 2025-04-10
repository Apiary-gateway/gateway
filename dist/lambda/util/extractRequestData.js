"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRequestData = extractRequestData;
exports.extractRequestMetadata = extractRequestMetadata;
const getConfig_1 = require("./getConfig");
const validateRequest_1 = require("./validateRequest");
function extractRequestData(parsed) {
    return {
        threadID: parsed.threadID || Date.now().toString(),
        prompt: parsed.prompt,
        provider: parsed.provider || undefined,
        model: parsed.model,
        userId: parsed.userId || undefined,
    };
}
function extractRequestMetadata(event, parsed) {
    if (!(0, validateRequest_1.requestIsValid)(event)) {
        console.error('Invalid request');
        return {};
    }
    const metadata = {};
    const config = (0, getConfig_1.getConfig)();
    try {
        for (const field of config.routing.availableMetadata || []) {
            const headerKey = `x-${field.toLowerCase()}`;
            metadata[field] = event.headers?.[headerKey];
        }
        return metadata;
    }
    catch (error) {
        console.error('Error extracting request metadata:', error);
        return {};
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdFJlcXVlc3REYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGFtYmRhL3V0aWwvZXh0cmFjdFJlcXVlc3REYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBS0EsZ0RBUUM7QUFFRCx3REFrQkM7QUFqQ0QsMkNBQXdDO0FBR3hDLHVEQUFtRDtBQUVuRCxTQUFnQixrQkFBa0IsQ0FBQyxNQUFzQjtJQUN2RCxPQUFPO1FBQ0wsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRTtRQUNsRCxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07UUFDckIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLElBQUksU0FBUztRQUN0QyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7UUFDbkIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLElBQUksU0FBUztLQUNuQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQWdCLHNCQUFzQixDQUFDLEtBQWMsRUFBRSxNQUFzQjtJQUN6RSxJQUFJLENBQUMsSUFBQSxnQ0FBYyxFQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDM0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUNELE1BQU0sUUFBUSxHQUFvQixFQUFFLENBQUM7SUFDckMsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBUyxHQUFFLENBQUM7SUFFM0IsSUFBSSxDQUFDO1FBQ0gsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLGlCQUFpQixJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQzNELE1BQU0sU0FBUyxHQUFHLEtBQUssS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7WUFDN0MsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDakIsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzRCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZ2V0Q29uZmlnIH0gZnJvbSAnLi9nZXRDb25maWcnO1xuaW1wb3J0IHsgUmVxdWVzdFBheWxvYWQgfSBmcm9tICcuL3NjaGVtYXMvcmVxdWVzdFNjaGVtYSc7XG5pbXBvcnQgeyBQYXJzZWRSZXF1ZXN0RGF0YSwgUmVxdWVzdE1ldGFkYXRhIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyByZXF1ZXN0SXNWYWxpZCB9IGZyb20gJy4vdmFsaWRhdGVSZXF1ZXN0JztcblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RSZXF1ZXN0RGF0YShwYXJzZWQ6IFJlcXVlc3RQYXlsb2FkKTogUGFyc2VkUmVxdWVzdERhdGEge1xuICByZXR1cm4ge1xuICAgIHRocmVhZElEOiBwYXJzZWQudGhyZWFkSUQgfHwgRGF0ZS5ub3coKS50b1N0cmluZygpLFxuICAgIHByb21wdDogcGFyc2VkLnByb21wdCxcbiAgICBwcm92aWRlcjogcGFyc2VkLnByb3ZpZGVyIHx8IHVuZGVmaW5lZCxcbiAgICBtb2RlbDogcGFyc2VkLm1vZGVsLFxuICAgIHVzZXJJZDogcGFyc2VkLnVzZXJJZCB8fCB1bmRlZmluZWQsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0UmVxdWVzdE1ldGFkYXRhKGV2ZW50OiB1bmtub3duLCBwYXJzZWQ6IFJlcXVlc3RQYXlsb2FkKTogUmVxdWVzdE1ldGFkYXRhIHtcbiAgICBpZiAoIXJlcXVlc3RJc1ZhbGlkKGV2ZW50KSkge1xuICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCByZXF1ZXN0Jyk7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuICAgIGNvbnN0IG1ldGFkYXRhOiBSZXF1ZXN0TWV0YWRhdGEgPSB7fTtcbiAgICBjb25zdCBjb25maWcgPSBnZXRDb25maWcoKTtcblxuICAgIHRyeSB7XG4gICAgICBmb3IgKGNvbnN0IGZpZWxkIG9mIGNvbmZpZy5yb3V0aW5nLmF2YWlsYWJsZU1ldGFkYXRhIHx8IFtdKSB7XG4gICAgICAgIGNvbnN0IGhlYWRlcktleSA9IGB4LSR7ZmllbGQudG9Mb3dlckNhc2UoKX1gO1xuICAgICAgICBtZXRhZGF0YVtmaWVsZF0gPSBldmVudC5oZWFkZXJzPy5baGVhZGVyS2V5XTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZXRhZGF0YTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGV4dHJhY3RpbmcgcmVxdWVzdCBtZXRhZGF0YTonLCBlcnJvcik7XG4gICAgcmV0dXJuIHt9O1xuICB9XG59XG5cblxuIl19