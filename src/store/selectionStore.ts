import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'eduforest_parent_selected_student_id';

type SelectionState = {
  selectedStudentId: number | null;
  hydrated: boolean;
  setSelectedStudentId: (id: number | null) => void;
  hydrate: () => Promise<void>;
};

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedStudentId: null,
  hydrated: false,
  setSelectedStudentId: (id) => {
    set({ selectedStudentId: id });
    if (id != null) {
      void AsyncStorage.setItem(STORAGE_KEY, String(id));
    } else {
      void AsyncStorage.removeItem(STORAGE_KEY);
    }
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? Number(raw) : null;
      set({
        selectedStudentId: parsed != null && Number.isFinite(parsed) ? parsed : null,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
}));
