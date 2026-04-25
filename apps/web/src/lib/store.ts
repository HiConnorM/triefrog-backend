import { create } from 'zustand';

interface ScanProgress {
  stage: string;
  progress: number;
  message: string;
}

interface AppState {
  projectId: string | null;
  setProjectId: (id: string) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  scanProgress: ScanProgress | null;
  setScanProgress: (p: ScanProgress | null) => void;
  activeDocId: string | null;
  setActiveDocId: (id: string | null) => void;
  activeCategory: string | null;
  setActiveCategory: (cat: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  projectId:
    typeof window !== 'undefined' ? localStorage.getItem('tf_project_id') : null,
  setProjectId: (id: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('tf_project_id', id);
    set({ projectId: id });
  },
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  scanProgress: null,
  setScanProgress: (p) => set({ scanProgress: p }),
  activeDocId: null,
  setActiveDocId: (id) => set({ activeDocId: id }),
  activeCategory: null,
  setActiveCategory: (cat) => set({ activeCategory: cat }),
}));
