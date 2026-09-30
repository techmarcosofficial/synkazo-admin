export interface DraftSyncJob {
  jobId: string | null;
  step: number;
  config?: {
    name?: string;
    sourcePlatform?: string;
    destPlatform?: string;
    sourceObject?: string;
    destObject?: string;
  };
  fieldMappings?: unknown[];
}

export function getDraftSyncJob(projectId: string): DraftSyncJob | null {
  try {
    const raw = sessionStorage.getItem(`sb_draft_${projectId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as DraftSyncJob;
  } catch {
    return null;
  }
}

export function getAllDraftSyncJobProjectIds(): string[] {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return [];
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('sb_draft_')) {
        keys.push(key.replace('sb_draft_', ''));
      }
    }
    return keys;
  } catch {
    return [];
  }
}

export function clearDraftSyncJob(projectId: string): void {
  try {
    sessionStorage.removeItem(`sb_draft_${projectId}`);
  } catch {
    /* ignore */
  }
}
