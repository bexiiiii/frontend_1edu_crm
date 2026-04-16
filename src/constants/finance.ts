import type {
  AmountChangeReasonCode,
  PaymentAmountChangeReasonCode,
  PaymentMethod,
  StudentPaymentMonthStatus,
  TransactionStatus,
  TransactionType,
} from '@/lib/api';

export const PAYMENT_SOURCES = [
  'Безналичный перевод',
  'Наличные переводы',
  'Kaspi QR',
  'Банковская карта',
  'Терминал',
];

export const INCOME_CATEGORIES = [
  'Пополнение средств',
  'Оплата за обучение',
  'Дополнительные услуги',
  'Прочие доходы',
];

export const EXPENSE_CATEGORIES = [
  'Заработная плата',
  'Канцелярские товары',
  'Аренда',
  'Коммунальные услуги',
  'Реклама',
  'Прочие расходы',
];

export const REFUND_CATEGORIES = [
  'Возврат клиенту',
  'Корректировка платежа',
  'Отмена покупки',
  'Прочий возврат',
];

export const FINANCE_TAB_LABELS: Record<TransactionType, string> = {
  INCOME: 'Доходы',
  EXPENSE: 'Расходы',
  REFUND: 'Возвраты',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING: 'Ожидает',
  COMPLETED: 'Проведено',
  CANCELLED: 'Отменено',
};

export const TRANSACTION_STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'PENDING', label: TRANSACTION_STATUS_LABELS.PENDING },
  { value: 'COMPLETED', label: TRANSACTION_STATUS_LABELS.COMPLETED },
  { value: 'CANCELLED', label: TRANSACTION_STATUS_LABELS.CANCELLED },
];

export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-100 text-amber-700',
  COMPLETED: 'border-green-200 bg-green-100 text-green-700',
  CANCELLED: 'border-red-200 bg-red-100 text-red-700',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Наличные',
  CARD: 'Карта',
  TRANSFER: 'Перевод',
  OTHER: 'Другое',
};

export const FINANCE_AMOUNT_CHANGE_REASON_LABELS: Record<AmountChangeReasonCode, string> = {
  DISCOUNT: 'Скидка',
  PENALTY: 'Штраф/надбавка',
  REFUND_ADJUSTMENT: 'Корректировка возврата',
  MANUAL_CORRECTION: 'Ручная корректировка',
  OTHER: 'Другое',
};

export const FINANCE_AMOUNT_CHANGE_REASON_OPTIONS: Array<{ value: AmountChangeReasonCode; label: string }> = [
  { value: 'DISCOUNT', label: FINANCE_AMOUNT_CHANGE_REASON_LABELS.DISCOUNT },
  { value: 'PENALTY', label: FINANCE_AMOUNT_CHANGE_REASON_LABELS.PENALTY },
  { value: 'REFUND_ADJUSTMENT', label: FINANCE_AMOUNT_CHANGE_REASON_LABELS.REFUND_ADJUSTMENT },
  { value: 'MANUAL_CORRECTION', label: FINANCE_AMOUNT_CHANGE_REASON_LABELS.MANUAL_CORRECTION },
  { value: 'OTHER', label: FINANCE_AMOUNT_CHANGE_REASON_LABELS.OTHER },
];

export const PAYMENT_AMOUNT_CHANGE_REASON_LABELS: Record<PaymentAmountChangeReasonCode, string> = {
  PARTIAL_PAYMENT: 'Частичная оплата',
  DISCOUNT_APPLIED: 'Применена скидка',
  DEBT_REPAYMENT: 'Погашение долга',
  MANUAL_CORRECTION: 'Ручная корректировка',
  OTHER: 'Другое',
};

export const PAYMENT_AMOUNT_CHANGE_REASON_OPTIONS: Array<{ value: PaymentAmountChangeReasonCode; label: string }> = [
  { value: 'PARTIAL_PAYMENT', label: PAYMENT_AMOUNT_CHANGE_REASON_LABELS.PARTIAL_PAYMENT },
  { value: 'DISCOUNT_APPLIED', label: PAYMENT_AMOUNT_CHANGE_REASON_LABELS.DISCOUNT_APPLIED },
  { value: 'DEBT_REPAYMENT', label: PAYMENT_AMOUNT_CHANGE_REASON_LABELS.DEBT_REPAYMENT },
  { value: 'MANUAL_CORRECTION', label: PAYMENT_AMOUNT_CHANGE_REASON_LABELS.MANUAL_CORRECTION },
  { value: 'OTHER', label: PAYMENT_AMOUNT_CHANGE_REASON_LABELS.OTHER },
];

export const STUDENT_PAYMENT_STATUS_LABELS: Record<StudentPaymentMonthStatus, string> = {
  PAID: 'Оплачено',
  PARTIAL: 'Частично',
  UNPAID: 'Не оплачено',
};

export const STUDENT_PAYMENT_STATUS_COLORS: Record<StudentPaymentMonthStatus, string> = {
  PAID: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  PARTIAL: 'border-amber-200 bg-amber-100 text-amber-700',
  UNPAID: 'border-rose-200 bg-rose-100 text-rose-700',
};
