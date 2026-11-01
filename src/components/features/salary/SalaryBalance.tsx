export function SalaryBalance({ amount }: { amount: number }) {
  const value = Number(amount) || 0;
  return <span className={value > 0 ? 'text-red-600' : 'text-emerald-600'}>
    {value < 0 ? 'Переплата: ' : ''}{Math.abs(value).toLocaleString('ru-RU')} ₸
  </span>;
}
