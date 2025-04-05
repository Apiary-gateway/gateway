import axios from 'axios';
import { LogsResponseSchema, LogResponseBody } from '../types/logs.types';

// const getLogsEndpoint = (): string => {
//   if (typeof window !== 'undefined' && 'LOGS_ENDPOINT' in window) {
//     return (window as any).LOGS_ENDPOINT;
//   }
//   alert('LOGS_ENDPOINT not configured');
//   throw new Error();
// };

export const getLogs = async (
  token: string | null
): Promise<LogResponseBody> => {
  // const LOGS_BASE_URL = getLogsEndpoint();
  const LOGS_BASE_URL =
    'https://mtr7cx7u23.execute-api.us-east-1.amazonaws.com/dev/logs';

  try {
    const { data } = await axios.get(`${LOGS_BASE_URL}`, {
      params: {
        token,
      },
    });

    return LogsResponseSchema.parse(data).body;
  } catch (error) {
    console.error('Error fetching logs:', error);
    alert('Error fetching logs');
    return { logs: [], page: 0, pageSize: 0, nextToken: null };
  }
};
