import useSWR from 'swr';
import { api, getProjectId } from '@/lib/api';

const fetcher = (fn: () => Promise<any>) => fn().then((r) => r.data?.data ?? r.data);

export function useProject(projectId?: string | null) {
  const id = projectId || getProjectId();
  return useSWR(id ? ['project', id] : null, () => fetcher(() => api.projects.get(id!)));
}

export function useProjectOverview(projectId?: string | null) {
  const id = projectId || getProjectId();
  return useSWR(id ? ['overview', id] : null, () => fetcher(() => api.projects.overview(id!)));
}

export function useMapData(projectId?: string | null) {
  const id = projectId || getProjectId();
  return useSWR(id ? ['map', id] : null, () => fetcher(() => api.map.get(id!)));
}

export function useTrieData(projectId?: string | null) {
  const id = projectId || getProjectId();
  return useSWR(id ? ['trie', id] : null, () => fetcher(() => api.map.trie(id!)));
}

export function useFindings(projectId?: string | null, params?: Record<string, string>) {
  const id = projectId || getProjectId();
  return useSWR(
    id ? ['findings', id, JSON.stringify(params)] : null,
    () => api.findings.list(id!, params).then((r) => r.data?.data ?? r.data),
  );
}

export function useDocs(projectId?: string | null) {
  const id = projectId || getProjectId();
  return useSWR(id ? ['docs', id] : null, () => fetcher(() => api.docs.list(id!)));
}

export function useDoc(docId?: string | null) {
  return useSWR(docId ? ['doc', docId] : null, () => fetcher(() => api.docs.get(docId!)));
}

export function useNode(nodeId?: string | null) {
  return useSWR(nodeId ? ['node', nodeId] : null, () => fetcher(() => api.map.node(nodeId!)));
}
