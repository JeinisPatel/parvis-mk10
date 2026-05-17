'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  analyzeDocument,
  type DocumentRecord,
  type UploadedDocument,
  type AnalysisResult,
} from '@/lib/api/documents';
import { readProfileSync } from '@/lib/hooks/useProfile';


/**
 * useDocuments — case-scoped document state.
 *
 * Documents are scoped to the case_reference from the current profile. If no
 * profile is set, we use 'unfiled' so uploads still work; switching to a real
 * case later re-fetches from the new case bucket.
 *
 * Local state shape:
 *   docs[]                 — list of uploaded docs (from backend manifest)
 *   analyses[file_id]      — analysis result keyed by file_id
 *   pendingAnalysis[fid]   — true while analysis is in flight
 *   uploadInProgress       — true during an upload
 *
 * Storage: nothing in localStorage — the source of truth is the backend
 * manifest. Analyses are kept in memory only (running them is cheap-ish but
 * not free; the user can re-run if they want fresh output). Phase A.5 will
 * persist analyses server-side.
 */

function resolveCaseRef(): string {
  try {
    const profile = readProfileSync();
    if (profile?.caseReference) return profile.caseReference;
  } catch { /* */ }
  return 'Unfiled';
}


export function useDocuments() {
  const [caseRef, setCaseRef] = useState<string>('Unfiled');
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});
  const [pendingAnalysis, setPendingAnalysis] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Resolve caseRef after hydration.
  useEffect(() => {
    const cr = resolveCaseRef();
    setCaseRef(cr);
  }, []);

  // Fetch the document list whenever caseRef changes.
  const refresh = useCallback(async () => {
    if (!caseRef) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listDocuments(caseRef);
      // Sort newest first.
      list.sort((a, b) => (b.uploaded_at || '').localeCompare(a.uploaded_at || ''));
      setDocs(list);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [caseRef]);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll the profile occasionally so a case-switch picks up new manifest.
  useEffect(() => {
    const id = window.setInterval(() => {
      const cr = resolveCaseRef();
      if (cr !== caseRef) setCaseRef(cr);
    }, 1500);
    return () => window.clearInterval(id);
  }, [caseRef]);

  const upload = useCallback(async (file: File): Promise<UploadedDocument | null> => {
    setUploadInProgress(true);
    setError(null);
    try {
      const uploaded = await uploadDocument(caseRef, file);
      await refresh();
      return uploaded;
    } catch (e: any) {
      setError(String(e?.message || e));
      return null;
    } finally {
      setUploadInProgress(false);
    }
  }, [caseRef, refresh]);

  const remove = useCallback(async (fileId: string): Promise<boolean> => {
    setError(null);
    try {
      await deleteDocument(caseRef, fileId);
      // Drop any analysis we had cached.
      setAnalyses((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      await refresh();
      return true;
    } catch (e: any) {
      setError(String(e?.message || e));
      return false;
    }
  }, [caseRef, refresh]);

  const analyze = useCallback(async (fileId: string): Promise<AnalysisResult | null> => {
    setPendingAnalysis((prev) => ({ ...prev, [fileId]: true }));
    setError(null);
    try {
      const result = await analyzeDocument(caseRef, fileId);
      setAnalyses((prev) => ({ ...prev, [fileId]: result }));
      return result;
    } catch (e: any) {
      setError(String(e?.message || e));
      return null;
    } finally {
      setPendingAnalysis((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
    }
  }, [caseRef]);

  return {
    caseRef,
    docs,
    loading,
    error,
    uploadInProgress,
    analyses,
    pendingAnalysis,
    upload,
    remove,
    analyze,
    refresh,
  };
}
