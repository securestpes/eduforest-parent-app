import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'eduforest_parent_selected_student_id';

type AttendanceHighlight = {
  highlightAttendanceId?: number;
  highlightSessionDate?: string;
};

type SelectionState = {
  selectedStudentId: number | null;
  hydrated: boolean;
  attendanceHighlight: AttendanceHighlight | null;
  setSelectedStudentId: (id: number | null) => void;
  setAttendanceHighlight: (highlight: AttendanceHighlight | null) => void;
  hydrate: () => Promise<void>;
};

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedStudentId: null,
  hydrated: false,
  attendanceHighlight: null,
  setSelectedStudentId: (id) => {
    set({ selectedStudentId: id });
    if (id != null) {
      void AsyncStorage.setItem(STORAGE_KEY, String(id));
    } else {
      void AsyncStorage.removeItem(STORAGE_KEY);
    }
  },
  setAttendanceHighlight: (highlight) => set({ attendanceHighlight: highlight }),
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
