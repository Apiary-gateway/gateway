"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogsFromAthena = exports.getLogsFromDynamo = exports.API_BASE_URL = void 0;
const axios_1 = __importDefault(require("axios"));
const logs_types_1 = require("../types/logs.types");
const getApiEndpoint = () => {
    console.log(window);
    if (typeof window !== 'undefined' && 'API_ENDPOINT' in window) {
        return window.API_ENDPOINT;
    }
    alert('API_ENDPOINT not configured');
    throw new Error();
};
exports.API_BASE_URL = getApiEndpoint();
// export const API_BASE_URL =
//   'https://doviowvjr7.execute-api.us-east-1.amazonaws.com/dev/';
const getLogsFromDynamo = async (nextToken) => {
    console.log(exports.API_BASE_URL);
    try {
        const { data } = await axios_1.default.get(`${exports.API_BASE_URL + 'logs'}`, {
            params: {
                nextToken,
            },
        });
        const logsResponse = logs_types_1.LogsResponseSchema.parse(data);
        return logsResponse;
    }
    catch (error) {
        console.error('Error fetching logs:', error);
        alert('Error fetching logs');
        return { logs: [], nextToken: null, pageSize: 0 };
    }
};
exports.getLogsFromDynamo = getLogsFromDynamo;
const getLogsFromAthena = async (nextToken, queryExecutionId) => {
    try {
        const { data } = await axios_1.default.get(`${exports.API_BASE_URL + 'logs'}`, {
            params: {
                nextToken,
                queryExecutionId,
                older: true,
            },
        });
        const logsResponse = logs_types_1.LogsResponseSchema.parse(data);
        return logsResponse;
    }
    catch (error) {
        console.error('Error fetching logs:', error);
        alert('Error fetching logs');
        return { logs: [], nextToken: null, pageSize: 0 };
    }
};
exports.getLogsFromAthena = getLogsFromAthena;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ncy5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vZnJvbnRlbmQtdWkvc3JjL3NlcnZpY2VzL2xvZ3Muc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrREFBMEI7QUFDMUIsb0RBQXVFO0FBRXZFLE1BQU0sY0FBYyxHQUFHLEdBQVcsRUFBRTtJQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3BCLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxJQUFJLGNBQWMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUM5RCxPQUFRLE1BQWMsQ0FBQyxZQUFZLENBQUM7SUFDdEMsQ0FBQztJQUNELEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztBQUNwQixDQUFDLENBQUM7QUFFVyxRQUFBLFlBQVksR0FBRyxjQUFjLEVBQUUsQ0FBQztBQUU3Qyw4QkFBOEI7QUFDOUIsbUVBQW1FO0FBRTVELE1BQU0saUJBQWlCLEdBQUcsS0FBSyxFQUNwQyxTQUF3QixFQUNELEVBQUU7SUFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBWSxDQUFDLENBQUM7SUFDMUIsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLG9CQUFZLEdBQUcsTUFBTSxFQUFFLEVBQUU7WUFDM0QsTUFBTSxFQUFFO2dCQUNOLFNBQVM7YUFDVjtTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHLCtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRCxPQUFPLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0MsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDN0IsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUM7SUFDcEQsQ0FBQztBQUNILENBQUMsQ0FBQztBQWxCVyxRQUFBLGlCQUFpQixxQkFrQjVCO0FBRUssTUFBTSxpQkFBaUIsR0FBRyxLQUFLLEVBQ3BDLFNBQXdCLEVBQ3hCLGdCQUErQixFQUMvQixFQUFFO0lBQ0YsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLG9CQUFZLEdBQUcsTUFBTSxFQUFFLEVBQUU7WUFDM0QsTUFBTSxFQUFFO2dCQUNOLFNBQVM7Z0JBQ1QsZ0JBQWdCO2dCQUNoQixLQUFLLEVBQUUsSUFBSTthQUNaO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxZQUFZLEdBQUcsK0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BELE9BQU8sWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3QyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUM3QixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUNwRCxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBcEJXLFFBQUEsaUJBQWlCLHFCQW9CNUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXhpb3MgZnJvbSAnYXhpb3MnO1xuaW1wb3J0IHsgTG9nc1Jlc3BvbnNlLCBMb2dzUmVzcG9uc2VTY2hlbWEgfSBmcm9tICcuLi90eXBlcy9sb2dzLnR5cGVzJztcblxuY29uc3QgZ2V0QXBpRW5kcG9pbnQgPSAoKTogc3RyaW5nID0+IHtcbiAgY29uc29sZS5sb2cod2luZG93KTtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmICdBUElfRU5EUE9JTlQnIGluIHdpbmRvdykge1xuICAgIHJldHVybiAod2luZG93IGFzIGFueSkuQVBJX0VORFBPSU5UO1xuICB9XG4gIGFsZXJ0KCdBUElfRU5EUE9JTlQgbm90IGNvbmZpZ3VyZWQnKTtcbiAgdGhyb3cgbmV3IEVycm9yKCk7XG59O1xuXG5leHBvcnQgY29uc3QgQVBJX0JBU0VfVVJMID0gZ2V0QXBpRW5kcG9pbnQoKTtcblxuLy8gZXhwb3J0IGNvbnN0IEFQSV9CQVNFX1VSTCA9XG4vLyAgICdodHRwczovL2Rvdmlvd3ZqcjcuZXhlY3V0ZS1hcGkudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vZGV2Lyc7XG5cbmV4cG9ydCBjb25zdCBnZXRMb2dzRnJvbUR5bmFtbyA9IGFzeW5jIChcbiAgbmV4dFRva2VuOiBzdHJpbmcgfCBudWxsXG4pOiBQcm9taXNlPExvZ3NSZXNwb25zZT4gPT4ge1xuICBjb25zb2xlLmxvZyhBUElfQkFTRV9VUkwpO1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgYXhpb3MuZ2V0KGAke0FQSV9CQVNFX1VSTCArICdsb2dzJ31gLCB7XG4gICAgICBwYXJhbXM6IHtcbiAgICAgICAgbmV4dFRva2VuLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGxvZ3NSZXNwb25zZSA9IExvZ3NSZXNwb25zZVNjaGVtYS5wYXJzZShkYXRhKTtcbiAgICByZXR1cm4gbG9nc1Jlc3BvbnNlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIGxvZ3M6JywgZXJyb3IpO1xuICAgIGFsZXJ0KCdFcnJvciBmZXRjaGluZyBsb2dzJyk7XG4gICAgcmV0dXJuIHsgbG9nczogW10sIG5leHRUb2tlbjogbnVsbCwgcGFnZVNpemU6IDAgfTtcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IGdldExvZ3NGcm9tQXRoZW5hID0gYXN5bmMgKFxuICBuZXh0VG9rZW46IHN0cmluZyB8IG51bGwsXG4gIHF1ZXJ5RXhlY3V0aW9uSWQ6IHN0cmluZyB8IG51bGxcbikgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgYXhpb3MuZ2V0KGAke0FQSV9CQVNFX1VSTCArICdsb2dzJ31gLCB7XG4gICAgICBwYXJhbXM6IHtcbiAgICAgICAgbmV4dFRva2VuLFxuICAgICAgICBxdWVyeUV4ZWN1dGlvbklkLFxuICAgICAgICBvbGRlcjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBsb2dzUmVzcG9uc2UgPSBMb2dzUmVzcG9uc2VTY2hlbWEucGFyc2UoZGF0YSk7XG4gICAgcmV0dXJuIGxvZ3NSZXNwb25zZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBmZXRjaGluZyBsb2dzOicsIGVycm9yKTtcbiAgICBhbGVydCgnRXJyb3IgZmV0Y2hpbmcgbG9ncycpO1xuICAgIHJldHVybiB7IGxvZ3M6IFtdLCBuZXh0VG9rZW46IG51bGwsIHBhZ2VTaXplOiAwIH07XG4gIH1cbn07XG4iXX0=