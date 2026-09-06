import React from 'react';
import type { ParentStudent } from '../../services/parent';
import { useAppLanguage } from '../../common';
import { StudentModuleHero } from './StudentModuleHero';

type Props = {
  student: ParentStudent | null;
  onBack?: () => void;
};

export function AttendanceHeroHeader({ student, onBack }: Props) {
  const { t } = useAppLanguage();

  return (
    <StudentModuleHero
      title={t('nav.attendance')}
      subtitle={t('tabs.attendanceSubtitle')}
      student={student}
      heroIcon="calendar-check-outline"
      onBack={onBack}
      backAccessibilityLabel={t('attendance.backHome')}
    />
  );
}
