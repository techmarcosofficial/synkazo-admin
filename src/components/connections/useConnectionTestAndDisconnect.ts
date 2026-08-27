import { useState } from 'react';
import { toast } from 'sonner';

import { PLATFORM_META } from './platformMeta';
import type { ExtConnection, TestResult } from './types';

import { connectionsApi } from '@/api/connections';

export function useConnectionTestAndDisconnect(
  conn: ExtConnection,
  onUpdated: (updated: ExtConnection | null) => void,
) {
  const meta = PLATFORM_META[conn.platformId] ?? { label: conn.platformId };

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await connectionsApi.testConnection(
        conn.projectId,
        conn.id,
      );
      const ok = result?.success === true;
      setTestResult({
        ok,
        msg: result?.message ?? (ok ? 'Connection verified' : 'Test failed'),
      });
      if (ok) {
        toast.success(`${meta.label} connection verified`);
        onUpdated?.({ ...conn, status: 'connected' });
      } else {
        toast.error(result?.message ?? `${meta.label} connection test failed`);
        onUpdated?.({ ...conn, status: 'error' });
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message ?? 'Connection test failed';
      setTestResult({ ok: false, msg });
      toast.error(msg);
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const handleDisconnect = async () => {
    try {
      await connectionsApi.deleteConnection(conn.projectId, conn.id);
      toast.success(`${meta.label} connection removed`);
      onUpdated?.(null);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to remove connection');
      throw err;
    }
  };

  return { testing, testResult, handleTest, handleDisconnect };
}
