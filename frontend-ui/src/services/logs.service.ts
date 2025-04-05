import axios from 'axios';
import { GetLogsResponseSchema, LogsResponse } from '../types/logs.types';

const getLogsEndpoint = (): string => {
  if (typeof window !== 'undefined' && 'LOGS_ENDPOINT' in window) {
    return (window as any).LOGS_ENDPOINT;
  }
  alert('LOGS_ENDPOINT not configured');
  throw new Error();
};

export const getLogs = async (token: string | null): Promise<LogsResponse> => {
  const LOGS_BASE_URL = getLogsEndpoint();
  try {
    const { data } = await axios.get(`${LOGS_BASE_URL}`, {
      params: {
        token,
      },
    });
    console.log(data);
    const parsedData = GetLogsResponseSchema.parse(data);
    return parsedData.body;
  } catch (error) {
    console.error('Error fetching logs:', error);
    alert('Error fetching logs');
    return { logs: [], page: 0, pageSize: 0, nextToken: null };
  }
};
