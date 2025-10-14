import axios from 'axios';

const DEFAULT_TIMEOUT = 10000;

const ATTEMPTS = [
  { base: '/api/v2', label: 'proxy' },
  { base: 'http://localhost:5051/api/v2', label: 'express-localhost' },
  { base: 'http://127.0.0.1:5051/api/v2', label: 'express-127.0.0.1' },
  { base: 'http://localhost:8788/api/v2', label: 'pages-dev' }
];

const V2 = axios.create({
  baseURL: '/api/v2',
  timeout: DEFAULT_TIMEOUT
});

const baseRequest = V2.request.bind(V2);

function buildAttempts(explicitBase) {
  const attempts = [];
  if (explicitBase) {
    attempts.push({ base: explicitBase, label: 'custom-base' });
  }
  for (const attempt of ATTEMPTS) {
    if (!attempts.some(entry => entry.base === attempt.base)) {
      attempts.push(attempt);
    }
  }
  return attempts;
}

function isHtmlResponse(response) {
  const contentType = response?.headers?.['content-type'] || response?.headers?.['Content-Type'] || '';
  if (contentType && contentType.includes('text/html')) {
    return true;
  }
  const data = response?.data;
  return typeof data === 'string' && data.trim().toLowerCase().startsWith('<!doctype html');
}

function shouldRetry(error) {
  if (!error) return false;
  if (error.__retryBypass) return false;
  const status = error.response?.status;
  const message = (error && error.message) || '';
  if (message === 'Unexpected HTML response') {
    return true;
  }
  if (error.name === 'SyntaxError' || /Unexpected token <|Unexpected end of JSON/.test(message)) {
    return true;
  }
  const isNetwork = !status && (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || message.includes('Network'));
  const isNotFound = status === 404;
  return Boolean(isNetwork || isNotFound);
}

async function requestWithFallback(config = {}) {
  const { baseURL: explicitBase, __skipFallback, ...restConfig } = config;
  if (__skipFallback) {
    return baseRequest(restConfig);
  }

  const attempts = buildAttempts(explicitBase);
  let lastError;

  for (const attempt of attempts) {
    try {
      const response = await baseRequest({
        timeout: DEFAULT_TIMEOUT,
        ...restConfig,
        baseURL: attempt.base
      });

      if (isHtmlResponse(response)) {
        lastError = new Error('Unexpected HTML response');
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Received HTML response from ${attempt.label}. Trying next base...`);
        }
        continue;
      }

      return response;
    } catch (error) {
      const message = error?.message || '';
      if (error?.name === 'SyntaxError' || /Unexpected token <|Unexpected end of JSON/.test(message)) {
        lastError = new Error('Unexpected HTML response');
      } else {
        lastError = error;
      }
      if (!shouldRetry(error)) {
        throw lastError;
      }
      if (process.env.NODE_ENV !== 'production') {
        const status = error.response?.status;
        console.warn(`Retrying via ${attempt.label} failed (${status || error.code || error.message}). Trying next base...`);
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error('Request failed with unknown error');
}

async function v2Request(method, url, data, config) {
  return requestWithFallback({
    ...(config || {}),
    method,
    url,
    data
  });
}

// Override axios instance methods to automatically use fallback logic
V2.request = (config) => requestWithFallback(config);

const METHODS_WITHOUT_DATA = ['get', 'delete', 'head', 'options'];
const METHODS_WITH_DATA = ['post', 'put', 'patch'];

for (const method of METHODS_WITHOUT_DATA) {
  V2[method] = (url, config) => requestWithFallback({
    ...(config || {}),
    method,
    url
  });
}

for (const method of METHODS_WITH_DATA) {
  V2[method] = (url, data, config) => requestWithFallback({
    ...(config || {}),
    method,
    url,
    data
  });
}

export { V2, v2Request };
