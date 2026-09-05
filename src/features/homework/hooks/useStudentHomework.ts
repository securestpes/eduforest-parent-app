import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMyStudents,
  getStudentHomework,
  getStudentHomeworkDetail,
  type ParentHomeworkDetail,
  type ParentHomeworkItem,
  type ParentStudent,
} from '../../../services/parent';
import { useSelectionStore } from '../../../store/selectionStore';
import {
  resolveHomeworkStatus,
  type HomeworkFilter,
  type HomeworkUiStatus,
} from '../utils/homeworkStatus';

export function useStudentHomework() {
  const studentId = useSelectionStore((s) => s.selectedStudentId);
  const setSelected = useSelectionStore((s) => s.setSelectedStudentId);
  const hydrated = useSelectionStore((s) => s.hydrated);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [items, setItems] = useState<ParentHomeworkItem[]>([]);
  const [className, setClassName] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<HomeworkFilter>('all');
  const [detail, setDetail] = useState<ParentHomeworkDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const student = students.find((s) => s.id === studentId) ?? students[0] ?? null;

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const st = await getMyStudents();
        const list = st.status && Array.isArray(st.data) ? st.data : [];
        setStudents(list);
        let id = studentId;
        if (id == null || !list.some((s) => s.id === id)) {
          id = list[0]?.id ?? null;
          if (id != null) setSelected(id);
        }
        if (id == null) {
          setItems([]);
          return;
        }
        const hw = await getStudentHomework(id);
        if (!hw.status || !hw.data) {
          setError(hw.message || 'Could not load homework');
          setItems([]);
          return;
        }
        setItems(hw.data.homeworks ?? []);
        setClassName(hw.data.className ?? hw.data.sessionName ?? null);
        setSectionName(hw.data.sectionName ?? null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not load homework');
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [studentId, setSelected]
  );

  useEffect(() => {
    if (!hydrated) return;
    void load();
  }, [hydrated, load]);

  const today = useMemo(() => new Date(), [items.length]);
  const withStatus = useMemo(
    () => items.map((item) => ({ item, status: resolveHomeworkStatus(item, today) })),
    [items, today]
  );

  const counts = useMemo(() => {
    const pending = withStatus.filter((x) => x.status === 'pending').length;
    const submitted = withStatus.filter((x) => x.status === 'submitted').length;
    const overdue = withStatus.filter((x) => x.status === 'overdue').length;
    return { pending, submitted, overdue, all: items.length };
  }, [withStatus, items.length]);

  const filtered = useMemo(() => {
    if (filter === 'all') return withStatus;
    return withStatus.filter((x) => x.status === filter);
  }, [filter, withStatus]);

  const openDetail = async (homeworkId: number) => {
    const id = student?.id;
    if (id == null) return;
    setDetailLoading(true);
    try {
      const res = await getStudentHomeworkDetail(id, homeworkId);
      if (res.status && res.data) setDetail(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const classLabel = [className, sectionName].filter(Boolean).join(' • ') || null;

  return {
    student,
    classLabel,
    className,
    sectionName,
    loading,
    refreshing,
    error,
    filter,
    setFilter,
    counts,
    filtered,
    load,
    detail,
    setDetail,
    detailLoading,
    openDetail,
  };
}

export type { HomeworkUiStatus };
