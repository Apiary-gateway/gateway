import axios from 'axios';
import { LogsResponse, LogsResponseSchema } from '../types/logs.types';

const getLogsEndpoint = (): string => {
  if (typeof window !== 'undefined' && 'LOGS_ENDPOINT' in window) {
    return (window as any).LOGS_ENDPOINT;
  }
  alert('LOGS_ENDPOINT not configured');
  throw new Error();
};

const LOGS_BASE_URL = getLogsEndpoint();
// const LOGS_BASE_URL =
//   'https://mtr7cx7u23.execute-api.us-east-1.amazonaws.com/dev/logs';

export const getLogsFromDynamo = async (
  nextToken: string | null
): Promise<LogsResponse> => {
  try {
    const { data } = await axios.get(`${LOGS_BASE_URL}`, {
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
    const { data } = await axios.get(`${LOGS_BASE_URL}`, {
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
