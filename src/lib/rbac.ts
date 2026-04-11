import type { SettingsTab } from '@/types/settings';

type AccessRule = {
  prefix: string;
  rolesAny?: string[];
  permissionsAny?: string[];
};

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN']);

const ALWAYS_ALLOWED_PREFIXES = [
  '/system',
  '/errors',
  '/maintenance',
  '/high-load',
  '/service-unavailable',
  '/under-development',
] as const;

const ROUTE_RULES: AccessRule[] = [
  { prefix: '/logs', rolesAny: ['SUPER_ADMIN', 'TENANT_ADMIN'] },
  { prefix: '/settings', rolesAny: ['TENANT_ADMIN', 'MANAGER', 'RECEPTIONIST', 'TEACHER'], permissionsAny: ['SETTINGS_VIEW'] },
  { prefix: '/notifications' },
  { prefix: '/analytics/group-attendance', rolesAny: ['TENANT_ADMIN', 'MANAGER', 'TEACHER'], permissionsAny: ['ANALYTICS_VIEW', 'LESSONS_VIEW'] },
  { prefix: '/analytics', rolesAny: ['TENANT_ADMIN', 'MANAGER'], permissionsAny: ['ANALYTICS_VIEW'] },
  { prefix: '/finance', rolesAny: ['TENANT_ADMIN'], permissionsAny: ['FINANCE_VIEW'] },
  { prefix: '/students', rolesAny: ['TENANT_ADMIN'], permissionsAny: ['STUDENTS_VIEW'] },
  { prefix: '/staff', rolesAny: ['TENANT_ADMIN'], permissionsAny: ['STAFF_VIEW'] },
  { prefix: '/tasks', rolesAny: ['TENANT_ADMIN'], permissionsAny: ['TASKS_VIEW'] },
  { prefix: '/classes', rolesAny: ['TENANT_ADMIN'], permissionsAny: ['GROUPS_VIEW'] },
  { prefix: '/schedule', rolesAny: ['TENANT_ADMIN'], permissionsAny: ['GROUPS_VIEW'] },
  {
    prefix: '/attendance',
    rolesAny: ['TENANT_ADMIN', 'MANAGER', 'RECEPTIONIST', 'TEACHER'],
    permissionsAny: ['LESSONS_VIEW', 'LESSONS_MARK_ATTENDANCE'],
  },
  { prefix: '/kanban', rolesAny: ['TENANT_ADMIN', 'MANAGER'], permissionsAny: ['LEADS_VIEW'] },
  { prefix: '/enrollments', rolesAny: ['TENANT_ADMIN', 'MANAGER'], permissionsAny: ['LEADS_VIEW'] },
  { prefix: '/', rolesAny: ['TENANT_ADMIN', 'MANAGER'], permissionsAny: ['ANALYTICS_VIEW'] },
];

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  if (pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (prefix === '/') {
    return pathname === '/';
  }

  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function hasAnyRole(roles: string[], expected: string[]): boolean {
  if (expected.length === 0) return true;
  const roleSet = new Set(roles);
  return expected.some((role) => roleSet.has(role));
}

export function hasAnyPermission(permissions: string[], expected: string[]): boolean {
  if (expected.length === 0) return true;
  const permissionSet = new Set(permissions);
  return expected.some((permission) => permissionSet.has(permission));
}

export function canAccessPath(pathname: string, roles: string[], permissions: string[]): boolean {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath === '/login') {
    return true;
  }

  if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => matchesPrefix(normalizedPath, prefix))) {
    return true;
  }

  if (roles.some((role) => ADMIN_ROLES.has(role))) {
    return true;
  }

  const matchedRule = ROUTE_RULES.find((rule) => matchesPrefix(normalizedPath, rule.prefix));
  if (!matchedRule) {
    return true;
  }

  const roleAllowed = matchedRule.rolesAny ? hasAnyRole(roles, matchedRule.rolesAny) : false;
  const permissionAllowed = matchedRule.permissionsAny
    ? hasAnyPermission(permissions, matchedRule.permissionsAny)
    : false;

  if (!matchedRule.rolesAny && !matchedRule.permissionsAny) {
    return true;
  }

  return roleAllowed || permissionAllowed;
}

export function canAccessSettingsTab(tab: SettingsTab, roles: string[], permissions: string[]): boolean {
  if (roles.some((role) => ADMIN_ROLES.has(role))) {
    return true;
  }

  switch (tab) {
    case 'user':
      return true;
    case 'company':
      return hasAnyRole(roles, ['MANAGER', 'RECEPTIONIST', 'TEACHER']) || hasAnyPermission(permissions, ['SETTINGS_VIEW']);
    case 'access':
      return hasAnyRole(roles, ['TENANT_ADMIN']);
    case 'roles':
      return hasAnyRole(roles, ['TENANT_ADMIN']);
    case 'rooms':
      return (
        hasAnyRole(roles, ['MANAGER', 'RECEPTIONIST', 'TEACHER']) ||
        hasAnyPermission(permissions, ['ROOMS_VIEW', 'SETTINGS_VIEW'])
      );
    case 'statuses':
      return (
        hasAnyRole(roles, ['MANAGER', 'RECEPTIONIST', 'TEACHER']) ||
        hasAnyPermission(permissions, ['SETTINGS_VIEW', 'LESSONS_VIEW', 'LESSONS_MARK_ATTENDANCE', 'STAFF_VIEW'])
      );
    case 'finance':
      return hasAnyRole(roles, ['MANAGER', 'ACCOUNTANT']) || hasAnyPermission(permissions, ['FINANCE_VIEW', 'SETTINGS_VIEW']);
    case 'integrations':
      return hasAnyPermission(permissions, ['SETTINGS_VIEW']);
    default:
      return false;
  }
}
