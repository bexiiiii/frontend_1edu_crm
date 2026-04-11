# 1edu crm - Система управления учебным центром

Современная CRM система для управления учебными центрами, построенная на Next.js 16 с TypeScript и Tailwind CSS.

![Dashboard Preview](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat&logo=tailwind-css)

## ✨ Возможности

- 📊 **Интерактивная панель управления** - визуализация ключевых метрик и статистики
- 💰 **Учет доходов** - отслеживание общего дохода и среднего чека
- 👥 **Управление студентами** - база данных всех учащихся
- 📚 **Каталог курсов** - управление образовательными программами
- 📈 **Аналитика и отчеты** - детальная статистика продаж и охвата
- 🎯 **Система заявок** - управление новыми записями на курсы
- 🏢 **Управление филиалами** - поддержка нескольких локаций
- 🎨 **Адаптивный дизайн** - работает на всех устройствах

## 🚀 Быстрый старт

Запустите сервер разработки:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере, чтобы увидеть результат.

## 📦 Технологический стек

- **Framework**: [Next.js 16](https://nextjs.org/) с App Router
- **Язык**: [TypeScript](https://www.typescriptlang.org/)
- **Стили**: [Tailwind CSS](https://tailwindcss.com/)
- **Графики**: [Recharts](https://recharts.org/)
- **Иконки**: [Lucide React](https://lucide.dev/)

## 📁 Структура проекта

```
1edu_crm/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Главный layout с Sidebar и Header
│   │   ├── page.tsx            # Главная страница (Dashboard)
│   │   └── globals.css         # Глобальные стили
│   └── components/
│       ├── Sidebar.tsx         # Боковое меню навигации
│       ├── Header.tsx          # Верхняя панель с поиском
│       ├── MetricCard.tsx      # Карточка метрики
│       ├── SalesChart.tsx      # График продаж
│       ├── OrdersChart.tsx     # Круговая диаграмма заявок
│       └── CourseReachChart.tsx # Тепловая карта охвата
└── package.json
```

## 🎨 Компоненты

### MetricCard
Отображает ключевые показатели с динамикой изменений:
- Общий доход
- Средний чек
- Количество студентов
- Проданные курсы

### SalesChart
Столбчатый график продаж по дням недели с интерактивными подсказками.

### OrdersChart
Круговая диаграмма распределения статусов заявок (Зачислено, В процессе, Отменено).

### CourseReachChart
Тепловая карта охвата курсов по различным платформам (Telegram, Instagram, Facebook, WhatsApp, YouTube).

## 📱 Адаптация для учебных центров

Проект адаптирован специально для образовательной сферы:

| Оригинальная метрика | Адаптация для образования |
|---------------------|---------------------------|
| Total Revenue       | Общий доход от курсов     |
| Average Order       | Средний чек за курс       |
| Total Customers     | Всего студентов           |
| Product Sold        | Курсов продано            |
| Orders              | Заявки на курсы           |
| Products            | Курсы                     |

## 🛠️ Доступные скрипты

```bash
# Режим разработки
npm run dev

# Сборка для продакшена
npm run build

# Запуск продакшен сервера
npm start

# Линтинг кода
npm run lint
```

## 🎯 Планы развития

- [ ] Интеграция с backend API
- [ ] Система аутентификации
- [ ] Управление преподавателями
- [ ] Расписание занятий
- [ ] Платежная система
- [ ] Email/SMS уведомления
- [ ] Экспорт отчетов в PDF/Excel

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
