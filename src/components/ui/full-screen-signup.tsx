"use client";

import { GraduationCap, Loader2, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';

type AuthMode = "login" | "signup";

/* ─── Extracted outside the parent to avoid remount on every keystroke ─── */
function InputField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
  showPassword,
  onTogglePassword,
  loading,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  loading?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          type={type === "password" && showPassword ? "text" : type}
          id={id}
          placeholder={placeholder}
          className={`crm-input ${error ? "border-red-400" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          autoComplete={autoComplete}
          disabled={loading}
        />
        {type === "password" && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

interface LoginData {
  username: string;
  password: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  centerName: string;
  subdomain: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

function resolveTenantSubdomain(hostname: string): string | null {
  const normalizedHostname = hostname.trim().toLowerCase();

  if (!normalizedHostname || normalizedHostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(normalizedHostname)) {
    return null;
  }

  if (
    normalizedHostname === '1edu.kz' ||
    normalizedHostname === 'www.1edu.kz' ||
    normalizedHostname === 'app.1edu.kz'
  ) {
    return null;
  }

  const rootDomainSuffix = '.1edu.kz';
  if (!normalizedHostname.endsWith(rootDomainSuffix)) {
    return null;
  }

  const subdomain = normalizedHostname.slice(0, -rootDomainSuffix.length);
  if (!subdomain || subdomain === 'app' || subdomain === 'www') {
    return null;
  }

  return subdomain;
}

export const FullScreenSignup = ({
  onLogin,
  onRegister,
  loading = false,
  serverError,
}: {
  onLogin?: (data: LoginData) => void;
  onRegister?: (data: RegisterData) => void;
  loading?: boolean;
  serverError?: string | null;
}) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [tenantSubdomain, setTenantSubdomain] = useState<string | null>(null);

  // Login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [centerName, setCenterName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setTenantSubdomain(resolveTenantSubdomain(window.location.hostname));
  }, []);

  const validateLogin = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!loginUsername.trim()) {
      newErrors.loginUsername = "Введите логин (username или email).";
    }

    if (!loginPassword || loginPassword.length < 6) {
      newErrors.loginPassword = "Пароль должен быть не менее 6 символов.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegister = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim() || firstName.length < 2) {
      newErrors.firstName = "Введите имя (мин. 2 символа).";
    }

    if (!lastName.trim() || lastName.length < 2) {
      newErrors.lastName = "Введите фамилию (мин. 2 символа).";
    }

    if (!centerName.trim() || centerName.length < 2) {
      newErrors.centerName = "Введите название учебного центра (мин. 2 символа).";
    }

    if (!subdomain.trim() || subdomain.length < 2 || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain)) {
      newErrors.subdomain = "Субдомен: только латиница, цифры и дефис, мин. 2 символа, не начинается/не заканчивается на дефис.";
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Введите корректный email.";
    }

    if (!phone.trim() || phone.length < 7) {
      newErrors.phone = "Введите номер телефона.";
    }

    if (!password || password.length < 8) {
      newErrors.password = "Пароль минимум 8 символов.";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Пароли не совпадают.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      if (!validateLogin()) return;
      onLogin?.({ username: loginUsername, password: loginPassword });
    } else {
      if (!validateRegister()) return;
      onRegister?.({
        firstName,
        lastName,
        centerName,
        subdomain,
        email,
        phone,
        password,
        confirmPassword,
      });
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setErrors({});
  };

  const handleTogglePassword = () => setShowPassword(!showPassword);

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f5f7] p-4">
      <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-xl md:flex-row">
        {/* Left branding */}
        <div className="relative isolate min-h-52.5 overflow-hidden bg-[#14254d] px-6 py-7 text-white md:w-1/2 md:min-h-0 md:px-12 md:py-10">
          <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-transparent to-[#14254d]" />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden overflow-hidden backdrop-blur-2xl md:flex">
            <div className="h-full w-12 overflow-hidden bg-linear-to-r from-transparent via-[#17346a] via-69% to-[#ffffff30] opacity-30" />
            <div className="h-full w-12 overflow-hidden bg-linear-to-r from-transparent via-[#17346a] via-69% to-[#ffffff30] opacity-30" />
            <div className="h-full w-12 overflow-hidden bg-linear-to-r from-transparent via-[#17346a] via-69% to-[#ffffff30] opacity-30" />
            <div className="h-full w-12 overflow-hidden bg-linear-to-r from-transparent via-[#17346a] via-69% to-[#ffffff30] opacity-30" />
            <div className="h-full w-12 overflow-hidden bg-linear-to-r from-transparent via-[#17346a] via-69% to-[#ffffff30] opacity-30" />
            <div className="h-full w-12 overflow-hidden bg-linear-to-r from-transparent via-[#17346a] via-69% to-[#ffffff30] opacity-30" />
          </div>
          <div className="pointer-events-none absolute -bottom-6 -left-6 z-0 h-28 w-40 rounded-full bg-[#467aff] md:bottom-0 md:left-0 md:h-60 md:w-60" />
          <div className="pointer-events-none absolute -bottom-1 -left-1 z-0 h-16 w-24 rounded-full bg-white md:bottom-0 md:left-0 md:h-20 md:w-32" />

          <h1 className="relative z-30 max-w-[30ch] text-[34px] font-bold leading-[1.1] tracking-tight md:text-5xl">
            Управляйте учебным центром эффективно
          </h1>
          <p className="relative z-30 mt-3 max-w-[38ch] text-sm leading-relaxed text-white/70 md:mt-4 md:text-base">
            Расписание, посещения, финансы, аналитика — всё в одном месте.
          </p>
        </div>

        {/* Right form panel */}
        <div className="relative z-10 flex flex-col bg-[#fbfcfd] p-6 text-[#1f2530] md:w-1/2 md:p-12">
          <div className="mb-6 flex flex-col items-start">
            <div className="mb-3 text-[#467aff]">
              <GraduationCap className="h-10 w-10" />
            </div>
            <h2 className="mb-1 text-3xl font-bold tracking-tight">
              {mode === "login" ? "Вход" : "Регистрация"}
            </h2>
            <p className="text-left text-sm text-[#798292]">
              {mode === "login"
                ? "Добро пожаловать в 1edu crm"
                : "Зарегистрируйте учебный центр"}
            </p>
            {mode === "login" && tenantSubdomain ? (
              <p className="mt-2 rounded-lg bg-[#edf3ff] px-3 py-2 text-left text-xs font-semibold text-[#315fd0]">
                Добро пожаловать в кабинет центра: {tenantSubdomain}
              </p>
            ) : null}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <form
            className="flex flex-col gap-3"
            onSubmit={handleSubmit}
            noValidate
          >
            {mode === "login" ? (
              /* ─── LOGIN FORM ─── */
              <>
                <InputField
                  id="loginUsername"
                  label="Логин"
                  placeholder="username или email"
                  value={loginUsername}
                  onChange={setLoginUsername}
                  error={errors.loginUsername}
                  autoComplete="username"
                  loading={loading}
                />
                <InputField
                  id="loginPassword"
                  label="Пароль"
                  type="password"
                  placeholder="Введите пароль"
                  value={loginPassword}
                  onChange={setLoginPassword}
                  error={errors.loginPassword}
                  autoComplete="current-password"
                  showPassword={showPassword}
                  onTogglePassword={handleTogglePassword}
                  loading={loading}
                />
              </>
            ) : (
              /* ─── REGISTER FORM ─── */
              <>
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    id="firstName"
                    label="Имя"
                    placeholder="Иван"
                    value={firstName}
                    onChange={setFirstName}
                    error={errors.firstName}
                    autoComplete="given-name"
                    loading={loading}
                  />
                  <InputField
                    id="lastName"
                    label="Фамилия"
                    placeholder="Петров"
                    value={lastName}
                    onChange={setLastName}
                    error={errors.lastName}
                    autoComplete="family-name"
                    loading={loading}
                  />
                </div>

                <InputField
                  id="centerName"
                  label="Название учебного центра"
                  placeholder="Учебный центр ABC"
                  value={centerName}
                  onChange={setCenterName}
                  error={errors.centerName}
                  autoComplete="organization"
                  loading={loading}
                />

                <InputField
                  id="subdomain"
                  label="Субдомен"
                  placeholder="abc-center"
                  value={subdomain}
                  onChange={(v) => setSubdomain(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  error={errors.subdomain}
                  loading={loading}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InputField
                    id="email"
                    label="Email"
                    type="email"
                    placeholder="admin@center.com"
                    value={email}
                    onChange={setEmail}
                    error={errors.email}
                    autoComplete="email"
                    loading={loading}
                  />
                  <div>
                    <PhoneInputWithCountry
                      label="Телефон"
                      value={phone}
                      onChange={setPhone}
                      placeholder="777 123 45 67"
                      disabled={loading}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                    )}
                  </div>
                </div>

                <InputField
                  id="password"
                  label="Пароль администратора"
                  type="password"
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  autoComplete="new-password"
                  showPassword={showPassword}
                  onTogglePassword={handleTogglePassword}
                  loading={loading}
                />

                <InputField
                  id="confirmPassword"
                  label="Повторите пароль"
                  type="password"
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  showPassword={showPassword}
                  onTogglePassword={handleTogglePassword}
                  loading={loading}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                />
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#467aff] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#3568eb] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login"
                ? loading ? "Вход..." : "Войти"
                : loading ? "Регистрация..." : "Создать аккаунт"}
            </button>

            <div className="text-center text-sm text-[#798292]">
              {mode === "login" ? (
                <>
                  Нет аккаунта?{" "}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="font-semibold text-[#467aff] underline hover:text-[#3568eb]"
                  >
                    Зарегистрироваться
                  </button>
                </>
              ) : (
                <>
                  Уже есть аккаунт?{" "}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="font-semibold text-[#467aff] underline hover:text-[#3568eb]"
                  >
                    Войти
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
