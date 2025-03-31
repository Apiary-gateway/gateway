import axios from 'axios';

const LOGS_BASE_URL =
  window?.LOGS_ENDPOINT ||
  'https://f04zlou195.execute-api.us-east-1.amazonaws.com/dev/logs';

export const getLogs = async () => {
  const response = await axios.get(`${LOGS_BASE_URL}`);
  return response.data;
};
