import { create } from 'zustand';

type DateRange = {
  label: string;
  from: string;
  to: string;
};

const dateRanges: DateRange[] = [
  { label: 'Last 10 days', from: 'Jan 27, 2024', to: 'Feb 6, 2024' },
  { label: 'Previous 10 days', from: 'Jan 17, 2024', to: 'Jan 26, 2024' },
  { label: 'Month to date', from: 'Feb 1, 2024', to: 'Feb 6, 2024' }
];

type DashboardState = {
  rangeIndex: number;
  dateRanges: DateRange[];
  nextRange: () => void;
  setRange: (index: number) => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  rangeIndex: 0,
  dateRanges,
  nextRange: () =>
    set((state) => ({
      rangeIndex: (state.rangeIndex + 1) % state.dateRanges.length
    })),
  setRange: (index) =>
    set((state) => ({
      rangeIndex: Math.max(0, Math.min(index, state.dateRanges.length - 1))
    }))
}));
