const GATEWAY_URL =
  'https://akszcgbua4.execute-api.us-east-1.amazonaws.com/dev/route';
const PROVIDER_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PROVIDER_MODEL = 'gpt-4o-mini';
const PROVIDER = 'openai';
const X_API_KEY = process.env.X_API_KEY;

const sendRequestToGateway = async (text) => {
  try {
    await fetch(GATEWAY_URL, {
      method: 'POST',
      body: JSON.stringify({
        model: OPENAI_MODEL,
        prompt: text,
        provider: 'openai',
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': X_API_KEY,
      },
    });
  } catch (error) {
    console.error('Request failed to gateway');
    throw error;
  }
};

const sendRequestToProvider = async (text) => {
  try {
    await fetch(OPENAI_URL, {
      method: 'POST',
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: text,
          },
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });
  } catch (error) {
    console.error('Request failed to provider');
    throw error;
  }
};

const getTimeForRequest = async (request) => {
  const startTime = Date.now();
  await request();
  const endTime = Date.now();
  return endTime - startTime;
};

const main = async () => {
  const NUM_REQUESTS = 100;
  const responseTimesForGateway = [];
  const responseTimesForProvider = [];

  for (let i = 0; i < NUM_REQUESTS; i++) {
    try {
      const responseTimePromises = [
        getTimeForRequest(sendRequestToGateway),
        getTimeForRequest(sendRequestToProvider),
      ];
      const [gatewayTime, providerTime] = await Promise.all(
        responseTimePromises
      );
      responseTimesForGateway.push(gatewayTime);
      responseTimesForProvider.push(providerTime);
    } catch (error) {
      console.error(`Request pair ${i + 1} failed:`, error);
      continue;
    }
  }
  const meanResponseTimeForGateway =
    responseTimesForGateway.reduce((a, b) => a + b, 0) /
    responseTimesForGateway.length;
  const meanResponseTimeForProvider =
    responseTimesForProvider.reduce((a, b) => a + b, 0) /
    responseTimesForProvider.length;

  console.log('Mean based on', meanResponseTimeForGateway.length, 'requests');
  console.log(
    `Mean response time for gateway: ${parseFloat(
      meanResponseTimeForGateway
    ).toFixed(3)} ms`
  );
  console.log(
    `Mean response time for provider: ${parseFloat(
      meanResponseTimeForProvider
    ).toFixed(3)} ms`
  );
};

main();
