import { getMyStudents } from './parent';
import { navigateToChildScreen } from '../navigation/navigationRef';
import { useSelectionStore } from '../store/selectionStore';

/** Opens the notifications panel (ChildHub) for the selected or first child. */
export async function openNotificationCenter(): Promise<void> {
  let studentId = useSelectionStore.getState().selectedStudentId ?? undefined;

  if (studentId == null) {
    try {
      const res = await getMyStudents();
      if (res.status && Array.isArray(res.data) && res.data[0]) {
        studentId = res.data[0].id;
      }
    } catch {
      // Still open notifications without a pre-selected child.
    }
  }

  navigateToChildScreen({ studentId, section: 'notifications' });
}
