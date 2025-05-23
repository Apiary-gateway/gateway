"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsResponseSchema = exports.LogEntrySchema = void 0;
const zod_1 = require("zod");
exports.LogEntrySchema = zod_1.z.object({
    id: zod_1.z.string().optional().nullable(),
    timestamp: zod_1.z.string().optional().nullable(),
    latency: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().nullable(),
    is_successful: zod_1.z.union([zod_1.z.boolean(), zod_1.z.string()]).optional().nullable(),
    success_reason: zod_1.z.string().optional().nullable(),
    error_reason: zod_1.z.string().optional().nullable(),
    model_routing_history: zod_1.z
        .union([zod_1.z.string(), zod_1.z.array(zod_1.z.any())])
        .optional()
        .nullable(),
    user_id: zod_1.z.string().optional().nullable(),
    metadata: zod_1.z.string().optional().nullable(),
    thread_id: zod_1.z.string().optional().nullable(),
    provider: zod_1.z.string().optional().nullable(),
    model: zod_1.z.string().optional().nullable(),
    cost: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().nullable(),
    raw_request: zod_1.z.string().optional().nullable(),
    raw_response: zod_1.z.string().optional().nullable(),
    error_message: zod_1.z.string().optional().nullable(),
});
exports.LogsResponseSchema = zod_1.z.object({
    logs: zod_1.z.array(exports.LogEntrySchema),
    pageSize: zod_1.z.number(),
    nextToken: zod_1.z.string().optional().nullable(),
    queryExecutionId: zod_1.z.string().optional().nullable(),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ncy50eXBlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2Zyb250ZW5kLXVpL3NyYy90eXBlcy9sb2dzLnR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZCQUF3QjtBQUVYLFFBQUEsY0FBYyxHQUFHLE9BQUMsQ0FBQyxNQUFNLENBQUM7SUFDckMsRUFBRSxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDcEMsU0FBUyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDM0MsT0FBTyxFQUFFLE9BQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDaEUsYUFBYSxFQUFFLE9BQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDdkUsY0FBYyxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDaEQsWUFBWSxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDOUMscUJBQXFCLEVBQUUsT0FBQztTQUNyQixLQUFLLENBQUMsQ0FBQyxPQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsT0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3JDLFFBQVEsRUFBRTtTQUNWLFFBQVEsRUFBRTtJQUNiLE9BQU8sRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3pDLFFBQVEsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzFDLFNBQVMsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzNDLFFBQVEsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzFDLEtBQUssRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3ZDLElBQUksRUFBRSxPQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzdELFdBQVcsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzdDLFlBQVksRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzlDLGFBQWEsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0NBQ2hELENBQUMsQ0FBQztBQUlVLFFBQUEsa0JBQWtCLEdBQUcsT0FBQyxDQUFDLE1BQU0sQ0FBQztJQUN6QyxJQUFJLEVBQUUsT0FBQyxDQUFDLEtBQUssQ0FBQyxzQkFBYyxDQUFDO0lBQzdCLFFBQVEsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFO0lBQ3BCLFNBQVMsRUFBRSxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzNDLGdCQUFnQixFQUFFLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDbkQsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5cbmV4cG9ydCBjb25zdCBMb2dFbnRyeVNjaGVtYSA9IHoub2JqZWN0KHtcbiAgaWQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKS5udWxsYWJsZSgpLFxuICB0aW1lc3RhbXA6IHouc3RyaW5nKCkub3B0aW9uYWwoKS5udWxsYWJsZSgpLFxuICBsYXRlbmN5OiB6LnVuaW9uKFt6LnN0cmluZygpLCB6Lm51bWJlcigpXSkub3B0aW9uYWwoKS5udWxsYWJsZSgpLFxuICBpc19zdWNjZXNzZnVsOiB6LnVuaW9uKFt6LmJvb2xlYW4oKSwgei5zdHJpbmcoKV0pLm9wdGlvbmFsKCkubnVsbGFibGUoKSxcbiAgc3VjY2Vzc19yZWFzb246IHouc3RyaW5nKCkub3B0aW9uYWwoKS5udWxsYWJsZSgpLFxuICBlcnJvcl9yZWFzb246IHouc3RyaW5nKCkub3B0aW9uYWwoKS5udWxsYWJsZSgpLFxuICBtb2RlbF9yb3V0aW5nX2hpc3Rvcnk6IHpcbiAgICAudW5pb24oW3ouc3RyaW5nKCksIHouYXJyYXkoei5hbnkoKSldKVxuICAgIC5vcHRpb25hbCgpXG4gICAgLm51bGxhYmxlKCksXG4gIHVzZXJfaWQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKS5udWxsYWJsZSgpLFxuICBtZXRhZGF0YTogei5zdHJpbmcoKS5vcHRpb25hbCgpLm51bGxhYmxlKCksXG4gIHRocmVhZF9pZDogei5zdHJpbmcoKS5vcHRpb25hbCgpLm51bGxhYmxlKCksXG4gIHByb3ZpZGVyOiB6LnN0cmluZygpLm9wdGlvbmFsKCkubnVsbGFibGUoKSxcbiAgbW9kZWw6IHouc3RyaW5nKCkub3B0aW9uYWwoKS5udWxsYWJsZSgpLFxuICBjb3N0OiB6LnVuaW9uKFt6LnN0cmluZygpLCB6Lm51bWJlcigpXSkub3B0aW9uYWwoKS5udWxsYWJsZSgpLFxuICByYXdfcmVxdWVzdDogei5zdHJpbmcoKS5vcHRpb25hbCgpLm51bGxhYmxlKCksXG4gIHJhd19yZXNwb25zZTogei5zdHJpbmcoKS5vcHRpb25hbCgpLm51bGxhYmxlKCksXG4gIGVycm9yX21lc3NhZ2U6IHouc3RyaW5nKCkub3B0aW9uYWwoKS5udWxsYWJsZSgpLFxufSk7XG5cbmV4cG9ydCB0eXBlIExvZ0VudHJ5ID0gei5pbmZlcjx0eXBlb2YgTG9nRW50cnlTY2hlbWE+O1xuXG5leHBvcnQgY29uc3QgTG9nc1Jlc3BvbnNlU2NoZW1hID0gei5vYmplY3Qoe1xuICBsb2dzOiB6LmFycmF5KExvZ0VudHJ5U2NoZW1hKSxcbiAgcGFnZVNpemU6IHoubnVtYmVyKCksXG4gIG5leHRUb2tlbjogei5zdHJpbmcoKS5vcHRpb25hbCgpLm51bGxhYmxlKCksXG4gIHF1ZXJ5RXhlY3V0aW9uSWQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKS5udWxsYWJsZSgpLFxufSk7XG5cbmV4cG9ydCB0eXBlIExvZ3NSZXNwb25zZSA9IHouaW5mZXI8dHlwZW9mIExvZ3NSZXNwb25zZVNjaGVtYT47XG4iXX0=