import type { AmountChangeReasonCode, TransactionStatus, TransactionType } from '@/lib/api';

export type FinanceTab = TransactionType;

export interface FinanceTransactionItem {
  id: string;
  type: TransactionType;
  amount: number;
  originalAmount: number;
  currency: string;
  transactionDate: string;
  category: string;
  description: string;
  notes: string;
  amountChangeReasonCode: AmountChangeReasonCode | '';
  amountChangeReasonOther: string;
  status: TransactionStatus;
  studentId: string;
  studentName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFormValues {
  amount: string;
  originalAmount: string;
  transactionDate: string;
  status: TransactionStatus;
  category: string;
  description: string;
  notes: string;
  amountChangeReasonCode: AmountChangeReasonCode | '';
  amountChangeReasonOther: string;
  studentId: string;
}

export interface FinanceFilters {
  search: string;
  status: TransactionStatus | 'all';
  studentId: string;
  periodStart: string;
  periodEnd: string;
}
