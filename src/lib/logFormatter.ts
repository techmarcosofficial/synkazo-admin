interface LogEntry {
  level?: string;
  message?: string;
  jobName?: string;
  recordsProcessed?: number;
}

export function formatLogMessage(log: LogEntry): string {
  const { level, message, recordsProcessed } = log;

  if (message?.includes('page') && message?.includes('job')) {
    return 'Syncing records in batches...';
  }
  if (message?.includes('completed') || level === 'success') {
    const count = recordsProcessed || 0;
    return count > 0 ? `${count} records transferred` : 'Sync completed';
  }
  if (level === 'error' && message?.includes('429')) {
    return 'Rate limit reached — retrying automatically';
  }
  if (level === 'error' && message?.includes('401')) {
    return 'Credentials expired — reconnect your account';
  }
  if (level === 'error') {
    return 'Sync encountered an issue — see Sync History for details';
  }
  if (level === 'warn') {
    return 'Sync completed with warnings';
  }
  return message && message.length > 80
    ? message.substring(0, 80) + '...'
    : message || 'Sync activity';
}
