import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/api/apiClient';

export default function QueueBoardRedirect() {
  const started = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void apiClient
      .post('/super-admin/platform/queue-board-session')
      .then(() => {
        const apiBase = new URL(
          apiClient.defaults.baseURL ?? '/api',
          window.location.origin,
        );
        window.location.replace(new URL('/api/admin/queues', apiBase.origin));
      })
      .catch(() => setError(true));
  }, []);

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Queue dashboard</h1>
      {error ? (
        <p className="mt-3">
          Could not open the queue dashboard.{' '}
          <Link to="/super-admin/overview" className="underline">
            Return to overview
          </Link>
        </p>
      ) : (
        <p className="mt-3">Opening a secure admin session…</p>
      )}
    </main>
  );
}
