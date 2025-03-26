export type VALID_PROVIDERS = 'openai' | 'anthropic' | 'gemini';
export type VALID_MODELS =
  | 'gpt-3.5-turbo'
  | 'gpt-4'
  | 'claude-3-opus-20240229'
  | 'gemini-1.5-pro';

export interface CommonLogData {
  requestStartTime: number;
  provider: VALID_PROVIDERS | null;
  model: VALID_MODELS | null;
  tokens_used: number;
  cost: number;
  RawRequest: string;
}

interface SuccessLogData extends CommonLogData {
  RawResponse: string;
}

interface ErrorLogData extends CommonLogData {
  errorMessage: string;
}

interface LogData {
  id: string;
  timestamp: string;
  provider: VALID_PROVIDERS | null;
  model: VALID_MODELS | null;
  tokens_used: number;
  cost: number;
  raw_request: string;
  raw_response: string | null;
  is_successful: boolean;
  error_message: string | null;
}

const getLatencyAndUtcDateTime = (requestStartTime: number) => {
  const latency = Date.now() - requestStartTime;

  const date = new Date(requestStartTime);
  const utcDateTime = date.toUTCString();

  return { latency, utcDateTime };
};

export const logSuccessfulRequest = async (successData: SuccessLogData) => {
  const { latency, utcDateTime } = getLatencyAndUtcDateTime(
    successData.requestStartTime
  );

  const logData: LogData = {
    id: String(Math.random()),
    timestamp: utcDateTime,
    provider: successData.provider,
    model: successData.model,
    tokens_used: successData.tokens_used,
    cost: successData.cost,
    is_successful: true,
    error_message: null,
    raw_request: successData.RawRequest,
    raw_response: successData.RawResponse,
  };

  console.log('Log Success Data', logData);
};

export const logFailedRequest = async (errorData: ErrorLogData) => {
  const { latency, utcDateTime } = getLatencyAndUtcDateTime(
    errorData.requestStartTime
  );

  const logData: LogData = {
    id: String(Math.random()),
    timestamp: utcDateTime,
    provider: errorData.provider,
    model: errorData.model,
    tokens_used: errorData.tokens_used,
    cost: errorData.cost,
    raw_request: errorData.RawRequest,
    raw_response: null,
    is_successful: false,
    error_message: errorData.errorMessage,
  };

  await Promise.resolve(1);
  console.log('ErrorLogData', logData);
};
