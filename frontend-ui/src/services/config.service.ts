import axios from 'axios';
import { LogsResponse, LogsResponseSchema } from '../types/logs.types';

const getConfigEndpoint = (): string => {
  if (typeof window !== 'undefined' && 'CONFIG_ENDPOINT' in window) {
    return (window as any).CONFIG_ENDPOINT;
  }
  alert('LOGS_ENDPOINT not configured');
  throw new Error();
};

const CONFIG_BASE_URL = getConfigEndpoint();