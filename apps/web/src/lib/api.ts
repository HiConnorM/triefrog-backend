import axios from 'axios';

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';

export const apiClient = axios.create({ baseURL: GATEWAY });

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('tf_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('tf_refresh_token');
      if (refreshToken && !err.config._retry) {
        err.config._retry = true;
        try {
          const { data } = await axios.post(`${GATEWAY}/auth/refresh`, { refreshToken });
          const tokens = data.data || data;
          localStorage.setItem('tf_access_token', tokens.accessToken);
          localStorage.setItem('tf_refresh_token', tokens.refreshToken);
          err.config.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return apiClient.request(err.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  },
);

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/auth/login', { email, password }),
    register: (data: { email: string; password: string; name: string; orgName: string }) =>
      apiClient.post('/auth/register', data),
    me: () => apiClient.get('/auth/me'),
    logout: (refreshToken: string) => apiClient.post('/auth/logout', { refreshToken }),
    refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
  },
  projects: {
    list: (orgId: string) => apiClient.get(`/projects?orgId=${orgId}`),
    get: (id: string) => apiClient.get(`/projects/${id}`),
    create: (data: { name: string; repoUrl: string; orgId: string; description?: string }) =>
      apiClient.post('/projects', data),
    overview: (id: string) => apiClient.get(`/projects/${id}/overview`),
    scan: (id: string) => apiClient.post(`/projects/${id}/scan`),
  },
  map: {
    get: (projectId: string) => apiClient.get(`/projects/${projectId}/map`),
    trie: (projectId: string) => apiClient.get(`/projects/${projectId}/trie`),
    node: (nodeId: string) => apiClient.get(`/nodes/${nodeId}`),
    updateStatus: (nodeId: string, status: string) =>
      apiClient.patch(`/nodes/${nodeId}/status`, { status }),
  },
  findings: {
    list: (projectId: string, params?: Record<string, string>) =>
      apiClient.get(`/projects/${projectId}/findings`, { params }),
    resolve: (findingId: string) =>
      apiClient.patch(`/findings/${findingId}/resolve`, { resolved: true }),
  },
  docs: {
    list: (projectId: string) => apiClient.get(`/projects/${projectId}/docs`),
    get: (docId: string) => apiClient.get(`/docs/${docId}`),
    generate: (projectId: string) => apiClient.post(`/projects/${projectId}/docs/generate`),
    verify: (docId: string) => apiClient.post(`/docs/${docId}/verify`, { attestedBy: 'user' }),
    exportPr: (projectId: string) => apiClient.post(`/projects/${projectId}/docs/export-pr`),
  },
  search: {
    query: (q: string, projectId?: string) =>
      apiClient.get('/search', { params: { q, ...(projectId ? { projectId } : {}) } }),
  },
};

export function getProjectId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('tf_project_id') || 'demo-project-id';
}

export function createScanStream(projectId: string, onEvent: (data: unknown) => void) {
  if (typeof window === 'undefined') return () => {};
  const REALTIME = GATEWAY.replace(':3000', ':3008');
  const token = localStorage.getItem('tf_access_token') || '';
  const url = `${REALTIME}/projects/${projectId}/scan/stream`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {}
  };
  es.onerror = () => es.close();
  return () => es.close();
}
