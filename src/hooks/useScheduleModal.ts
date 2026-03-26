import { useState } from 'react';
import { WeekDay, CustomScheduleTime } from '@/types/schedule';

export const useScheduleModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<WeekDay[]>([]);
  const [customSchedule, setCustomSchedule] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
    resetForm();
  };

  const toggleDay = (day: WeekDay) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const resetForm = () => {
    setSelectedDays([]);
    setCustomSchedule(false);
  };

  return {
    isOpen,
    openModal,
    closeModal,
    selectedDays,
    toggleDay,
    customSchedule,
    setCustomSchedule,
  };
};
