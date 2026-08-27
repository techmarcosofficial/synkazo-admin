interface ApiErrorShape {
  response?: {
    status?: number;
    data?: { message?: string; code?: string };
  };
  message?: string;
}

const ERROR_MAP: Record<string | number, string> = {
  429: "HubSpot is temporarily limiting requests. We'll retry automatically in a few minutes.",
  401: 'Your credentials have expired. Please reconnect your account in Connections.',
  403: "You don't have permission to do that. Contact your account admin.",
  404: 'That record could not be found. It may have been deleted.',
  500: 'Something went wrong on our end. Please try again in a moment.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
  ECONNREFUSED: 'Could not reach the server. Check your internet connection.',
  'Network Error':
    'Connection failed. Check your internet connection and try again.',
};

const MESSAGE_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /credentials.*not.*verified/i,
    message:
      'Your credentials could not be verified. Please check them and try again.',
  },
  {
    pattern: /token.*expired/i,
    message: 'Your session has expired. Please log in again.',
  },
  {
    pattern: /duplicate.*entry/i,
    message: 'A record with this information already exists.',
  },
  {
    pattern: /validation.*failed/i,
    message: 'Please check the form for missing or incorrect fields.',
  },
];

// Statuses where the backend message is a generic framework string (or absent), so the
// hand-written copy below is more useful to the user than whatever the server sent.
const PREFER_GENERIC_FOR_STATUS = new Set([401, 429, 500, 503]);

export function getUserFriendlyError(error: ApiErrorShape): string {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  // The backend already writes user-facing copy for most 4xx errors (plan limits,
  // validation, business-rule rejections like "Only a subscription pending cancellation
  // can be reactivated."). Prefer it — it's always more specific than a generic mapping.
  if (
    serverMessage &&
    typeof serverMessage === 'string' &&
    !(status && PREFER_GENERIC_FOR_STATUS.has(status))
  ) {
    return serverMessage;
  }

  if (status && ERROR_MAP[status]) return ERROR_MAP[status];

  const message = error?.message || serverMessage || '';
  for (const { pattern, message: friendly } of MESSAGE_PATTERNS) {
    if (pattern.test(message)) return friendly;
  }

  if (message && ERROR_MAP[message]) return ERROR_MAP[message];

  return message || 'Something went wrong. Please try again.';
}
