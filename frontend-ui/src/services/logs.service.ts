import axios from 'axios';
import { LogsResponse, LogsResponseSchema } from '../types/logs.types';

// const getApiEndpoint = (): string => {
//   console.log(window);
//   if (typeof window !== 'undefined' && 'API_ENDPOINT' in window) {
//     return (window as any).API_ENDPOINT;
//   }
//   alert('API_ENDPOINT not configured');
//   throw new Error();
// };

// export const API_BASE_URL = getApiEndpoint();

export const API_BASE_URL =
  'https://doviowvjr7.execute-api.us-east-1.amazonaws.com/dev/';

export const getLogsFromDynamo = async (
  nextToken: string | null
): Promise<LogsResponse> => {
  console.log(API_BASE_URL);
  try {
    const { data } = await axios.get(`${API_BASE_URL + 'logs'}`, {
      params: {
        nextToken,
      },
    });

    const logsResponse = LogsResponseSchema.parse(data);
    return logsResponse;
  } catch (error) {
    console.error('Error fetching logs:', error);
    alert('Error fetching logs');
    return { logs: [], nextToken: null, pageSize: 0 };
  }
};

export const getLogsFromAthena = async (
  nextToken: string | null,
  queryExecutionId: string | null
) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL + 'logs'}`, {
      params: {
        nextToken,
        queryExecutionId,
        older: true,
      },
    });

    const logsResponse = LogsResponseSchema.parse(data);
    return logsResponse;
  } catch (error) {
    console.error('Error fetching logs:', error);
    alert('Error fetching logs');
    return { logs: [], nextToken: null, pageSize: 0 };
  }
};
