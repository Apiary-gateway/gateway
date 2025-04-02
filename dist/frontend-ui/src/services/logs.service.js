"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogs = void 0;
const axios_1 = require("axios");
const logs_types_1 = require("../types/logs.types");
const LOGS_BASE_URL = 
// @ts-ignore
window?.LOGS_ENDPOINT ||
    'https://h157xcj6t5.execute-api.us-east-2.amazonaws.com/dev/logs';
const getLogs = async (token) => {
    try {
        const { data } = await axios_1.default.get(`${LOGS_BASE_URL}`, {
            params: {
                token,
            },
        });
        console.log(data);
        const parsedData = logs_types_1.GetLogsResponseSchema.parse(data);
        return parsedData.body;
    }
    catch (error) {
        console.error('Error fetching logs:', error);
        alert('Error fetching logs');
        return { logs: [], page: 0, pageSize: 0, nextToken: null };
    }
};
exports.getLogs = getLogs;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ncy5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vZnJvbnRlbmQtdWkvc3JjL3NlcnZpY2VzL2xvZ3Muc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpQ0FBMEI7QUFDMUIsb0RBQTBFO0FBRTFFLE1BQU0sYUFBYTtBQUNqQixhQUFhO0FBQ2IsTUFBTSxFQUFFLGFBQWE7SUFDckIsaUVBQWlFLENBQUM7QUFFN0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQW9CLEVBQXlCLEVBQUU7SUFDM0UsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGFBQWEsRUFBRSxFQUFFO1lBQ25ELE1BQU0sRUFBRTtnQkFDTixLQUFLO2FBQ047U0FDRixDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sVUFBVSxHQUFHLGtDQUFxQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUM7SUFDekIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzdCLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDN0QsQ0FBQztBQUNILENBQUMsQ0FBQztBQWZXLFFBQUEsT0FBTyxXQWVsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBheGlvcyBmcm9tICdheGlvcyc7XG5pbXBvcnQgeyBHZXRMb2dzUmVzcG9uc2VTY2hlbWEsIExvZ3NSZXNwb25zZSB9IGZyb20gJy4uL3R5cGVzL2xvZ3MudHlwZXMnO1xuXG5jb25zdCBMT0dTX0JBU0VfVVJMID1cbiAgLy8gQHRzLWlnbm9yZVxuICB3aW5kb3c/LkxPR1NfRU5EUE9JTlQgfHxcbiAgJ2h0dHBzOi8vaDE1N3hjajZ0NS5leGVjdXRlLWFwaS51cy1lYXN0LTIuYW1hem9uYXdzLmNvbS9kZXYvbG9ncyc7XG5cbmV4cG9ydCBjb25zdCBnZXRMb2dzID0gYXN5bmMgKHRva2VuOiBzdHJpbmcgfCBudWxsKTogUHJvbWlzZTxMb2dzUmVzcG9uc2U+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEgfSA9IGF3YWl0IGF4aW9zLmdldChgJHtMT0dTX0JBU0VfVVJMfWAsIHtcbiAgICAgIHBhcmFtczoge1xuICAgICAgICB0b2tlbixcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgY29uc3QgcGFyc2VkRGF0YSA9IEdldExvZ3NSZXNwb25zZVNjaGVtYS5wYXJzZShkYXRhKTtcbiAgICByZXR1cm4gcGFyc2VkRGF0YS5ib2R5O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIGxvZ3M6JywgZXJyb3IpO1xuICAgIGFsZXJ0KCdFcnJvciBmZXRjaGluZyBsb2dzJyk7XG4gICAgcmV0dXJuIHsgbG9nczogW10sIHBhZ2U6IDAsIHBhZ2VTaXplOiAwLCBuZXh0VG9rZW46IG51bGwgfTtcbiAgfVxufTtcbiJdfQ==