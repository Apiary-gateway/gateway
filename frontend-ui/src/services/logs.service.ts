import axios from 'axios';
import { GetLogsResponseSchema, LogsResponse } from '../types/logs.types';

const LOGS_BASE_URL =
  // @ts-ignore
  window?.LOGS_ENDPOINT ||
  'https://h157xcj6t5.execute-api.us-east-2.amazonaws.com/dev/logs';

export const getLogs = async (token: string | null): Promise<LogsResponse> => {
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
