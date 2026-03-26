import type {
  CourseFormat,
  CourseStatus,
  CourseType,
  LessonStatus,
  LessonType,
} from '@/lib/api';

export type ClassType = 'group' | 'individual';
export type ClassFormat = 'offline' | 'online';
export type ClassStatus = 'active' | 'inactive' | 'archived';

export interface ClassParticipant {
  id: string;
  name: string;
  phone?: string;
}

export interface Class {
  id: string;
  type: ClassType;
  format: ClassFormat;
  name: string;
  description: string;
  basePrice: number;
  enrollmentLimit?: number;
  color: string;
  status: ClassStatus;
  participants: ClassParticipant[];
  teachers: string[];
  room?: string;
  students: number;
}

export interface ClassFormData {
  type: ClassType;
  format: ClassFormat;
  name: string;
  description: string;
  basePrice: number;
  enrollmentLimit?: number;
  color: string;
  status: ClassStatus;
  participants: ClassParticipant[];
  teachers: string[];
  room?: string;
}

export interface ClassFilters {
  searchName: string;
  type: ClassType | 'all';
  status: ClassStatus | 'all';
  teacher: string | 'all';
}

export interface LessonListItem {
  id: string;
  title: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  lessonType: LessonType;
  status: LessonStatus;
  groupId: string | null;
  groupName: string;
  teacherId: string | null;
  teacherName: string;
  roomId: string | null;
  roomName: string;
  capacity: number | null;
  topic: string;
  homework: string;
  notes: string;
}

export interface LessonFilters {
  search: string;
  type: LessonType | 'all';
  status: LessonStatus | 'all';
  teacherId: string | 'all';
}

export interface LessonFormValues {
  lessonDate: string;
  startTime: string;
  endTime: string;
  groupId: string;
  teacherId: string;
  roomId: string;
  lessonType: LessonType;
  capacity: string;
  topic: string;
  homework: string;
  notes: string;
}

export interface CourseListItem {
  id: string;
  type: CourseType;
  format: CourseFormat;
  name: string;
  description: string;
  basePrice: number | null;
  enrollmentLimit: number | null;
  color: string;
  status: CourseStatus;
  teacherId: string | null;
  teacherName: string;
  roomId: string | null;
  roomName: string;
  studentIds: string[];
  studentNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseFilters {
  search: string;
  type: CourseType | 'all';
  format: CourseFormat | 'all';
  status: CourseStatus | 'all';
  teacherId: string | 'all';
}

export interface CourseFormValues {
  type: CourseType;
  format: CourseFormat;
  name: string;
  description: string;
  basePrice: string;
  enrollmentLimit: string;
  color: string;
  status: CourseStatus;
  teacherId: string;
  roomId: string;
  studentIds: string[];
}
