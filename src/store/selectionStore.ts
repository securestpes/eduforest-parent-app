import { create } from 'zustand';

type SelectionState = {
  selectedStudentId: number | null;
  setSelectedStudentId: (id: number | null) => void;
};

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedStudentId: null,
  setSelectedStudentId: (id) => set({ selectedStudentId: id }),
}));
