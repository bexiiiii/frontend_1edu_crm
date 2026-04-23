/* eslint-disable @next/next/no-img-element */
import { useEffect, useId, useMemo, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';
import {
  STUDENT_GENDER_OPTIONS,
  STUDENT_STATUS_OPTIONS,
} from '@/constants/student';
import { useResolvedFileUrl } from '@/hooks/useResolvedFileUrl';
import { filesService, type CreateStudentRequest, type UpdateStudentRequest } from '@/lib/api';
import { pushToast } from '@/lib/toast';
import type { StudentFormValues } from '@/types/student';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateStudentRequest | UpdateStudentRequest) => Promise<void> | void;
  onSaveAndOpen?: (data: CreateStudentRequest | UpdateStudentRequest) => Promise<void> | void;
  initialValues?: StudentFormValues;
  isSubmitting?: boolean;
  title?: string;
  includeStatus?: boolean;
}

function getDefaultValues(): StudentFormValues {
  return {
    fullName: '',
    firstName: '',
    lastName: '',
    middleName: '',
    customer: '',
    studentPhoto: '',
    email: '',
    phone: '',
    studentPhone: '',
    birthDate: '',
    gender: '',
    status: 'ACTIVE',
    parentName: '',
    parentPhone: '',
    address: '',
    city: '',
    school: '',
    grade: '',
    additionalInfo: '',
    contract: '',
    comment: '',
    stateOrderParticipant: false,
    additionalPhones: '',
    notes: '',
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return 'Не удалось сохранить ученика. Попробуйте ещё раз.';
}

export const AddStudentModal = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndOpen,
  initialValues,
  isSubmitting = false,
  title = 'Добавить ученика',
  includeStatus = false,
}: AddStudentModalProps) => {
  const defaults = initialValues ?? getDefaultValues();
  const photoInputId = useId();

  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [middleName, setMiddleName] = useState(defaults.middleName);
  const [customer, setCustomer] = useState(defaults.customer);
  const studentPhoto = defaults.studentPhoto;
  const [email, setEmail] = useState(defaults.email);
  const [phone, setPhone] = useState(defaults.phone);
  const [birthDate, setBirthDate] = useState(defaults.birthDate);
  const [gender, setGender] = useState(defaults.gender);
  const [status, setStatus] = useState(defaults.status);
  const [parentName, setParentName] = useState(defaults.parentName);
  const [parentPhone, setParentPhone] = useState(defaults.parentPhone);
  const [address, setAddress] = useState(defaults.address);
  const [city, setCity] = useState(defaults.city);
  const [school, setSchool] = useState(defaults.school);
  const [grade, setGrade] = useState(defaults.grade);
  const [additionalInfo, setAdditionalInfo] = useState(defaults.additionalInfo);
  const [contract, setContract] = useState(defaults.contract);
  const [comment, setComment] = useState(defaults.comment);
  const [stateOrderParticipant, setStateOrderParticipant] = useState(defaults.stateOrderParticipant);
  const [additionalPhones, setAdditionalPhones] = useState(defaults.additionalPhones);
  const [notes, setNotes] = useState(defaults.notes);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const resolvedStudentPhotoUrl = useResolvedFileUrl(studentPhoto);
  const isLastNameInvalid = showValidationErrors && !lastName.trim();
  const isFirstNameInvalid = showValidationErrors && !firstName.trim();

  const photoPreviewUrl = useMemo(() => {
    if (!selectedPhotoFile) {
      return resolvedStudentPhotoUrl;
    }

    return URL.createObjectURL(selectedPhotoFile);
  }, [resolvedStudentPhotoUrl, selectedPhotoFile]);

  useEffect(() => {
    if (!selectedPhotoFile) {
      return;
    }

    return () => {
      URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl, selectedPhotoFile]);

  useEffect(() => {
    if (isOpen) {
      setShowValidationErrors(false);
    }
  }, [isOpen]);

  const buildPayload = async (): Promise<CreateStudentRequest | UpdateStudentRequest> => {
    let uploadedPhotoUrl = studentPhoto.trim() || undefined;

    if (selectedPhotoFile) {
      setIsUploadingPhoto(true);
      try {
        const uploadResponse = await filesService.upload(selectedPhotoFile, 'avatars');
        uploadedPhotoUrl = uploadResponse.data.url || uploadedPhotoUrl;
      } catch (uploadError) {
        throw new Error(getErrorMessage(uploadError) || 'Не удалось загрузить фото ученика.');
      } finally {
        setIsUploadingPhoto(false);
      }
    }

    return {
      fullName: [lastName.trim(), firstName.trim(), middleName.trim()].filter(Boolean).join(' ') || undefined,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      middleName: middleName.trim() || undefined,
      status,
      customer: customer.trim() || undefined,
      studentPhoto: uploadedPhotoUrl,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      birthDate: birthDate || undefined,
      gender: gender || undefined,
      parentName: parentName.trim() || undefined,
      parentPhone: parentPhone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      school: school.trim() || undefined,
      grade: grade.trim() || undefined,
      additionalInfo: additionalInfo.trim() || undefined,
      contract: contract.trim() || undefined,
      comment: comment.trim() || undefined,
      stateOrderParticipant,
      additionalPhones: additionalPhones
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      notes: notes.trim() || undefined,
    };
  };

  const submit = async (handler: (data: CreateStudentRequest | UpdateStudentRequest) => Promise<void> | void) => {
    if (!firstName.trim() || !lastName.trim()) {
      setShowValidationErrors(true);
      pushToast({
        message: 'Заполните обязательные поля: фамилия и имя.',
        tone: 'error',
      });
      return;
    }

    setShowValidationErrors(false);

    try {
      const payload = await buildPayload();
      await handler(payload);
    } catch (submitError) {
      pushToast({
        message: getErrorMessage(submitError),
        tone: 'error',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting || isUploadingPhoto}>
            Отмена
          </Button>
          {onSaveAndOpen ? (
            <Button
              variant="secondary"
              onClick={() => void submit(onSaveAndOpen)}
              disabled={isSubmitting || isUploadingPhoto}
            >
              Добавить и открыть
            </Button>
          ) : null}
          <Button onClick={() => void submit(onSave)} disabled={isSubmitting || isUploadingPhoto}>
            {isUploadingPhoto ? 'Загружаем фото...' : isSubmitting ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {includeStatus ? (
          <Select
            label="Статус"
            value={status}
            onChange={(event) => setStatus(event.target.value as StudentFormValues['status'])}
          >
            {STUDENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Фамилия"
            value={lastName}
            onChange={(event) => {
              setLastName(event.target.value);
            }}
            placeholder="Иванов"
            error={isLastNameInvalid}
          />
          <Input
            label="Имя"
            value={firstName}
            onChange={(event) => {
              setFirstName(event.target.value);
            }}
            placeholder="Иван"
            error={isFirstNameInvalid}
          />
          <Input
            label="Отчество"
            labelSuffix="(опционально)"
            value={middleName}
            onChange={(event) => setMiddleName(event.target.value)}
            placeholder="Иванович"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#5d6676]">
            Фото ученика
            <span className="ml-1 text-[#8c95a3]">(опционально)</span>
          </label>
          <input
            id={photoInputId}
            type="file"
            accept="image/*"
            onChange={(event) => setSelectedPhotoFile(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <label
            htmlFor={photoInputId}
            className="flex min-h-34 cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[#cad8ff] bg-[#f8fbff] p-4 transition-colors hover:border-[#467aff] hover:bg-[#f1f6ff]"
          >
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#dbe2e8] bg-white">
              {photoPreviewUrl ? (
                <img
                  src={photoPreviewUrl}
                  alt="Фото ученика"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-8 w-8 text-[#7f92c4]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#273142]">
                {photoPreviewUrl ? 'Обновить фотографию' : 'Загрузить фотографию'}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#467aff] px-3 py-2 text-sm font-semibold text-white">
                <Upload className="h-4 w-4" />
                Выбрать файл
              </div>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PhoneInputWithCountry
            label="Телефон"
            value={phone}
            onChange={setPhone}
            placeholder="+7 777 000 00 00"
          />
          <PhoneInputWithCountry
            label="Доп. телефон"
            value={additionalPhones}
            onChange={setAdditionalPhones}
            placeholder="+7 777 111 11 11"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Email"
            labelSuffix="(опционально)"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@example.com"
          />
          <Input
            label="Дата рождения"
            labelSuffix="(опционально)"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
          <Select
            label="Пол"
            labelSuffix="(опционально)"
            value={gender}
            onChange={(event) => setGender(event.target.value as StudentFormValues['gender'])}
          >
            <option value="">Не указан</option>
            {STUDENT_GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Родитель"
            labelSuffix="(опционально)"
            value={parentName}
            onChange={(event) => setParentName(event.target.value)}
            placeholder="ФИО родителя"
          />
          <PhoneInputWithCountry
            label="Телефон родителя"
            value={parentPhone}
            onChange={setParentPhone}
            placeholder="+7 777 222 22 22"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Город"
            labelSuffix="(опционально)"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Алматы"
          />
          <Input
            label="Школа"
            labelSuffix="(опционально)"
            value={school}
            onChange={(event) => setSchool(event.target.value)}
            placeholder="Школа №12"
          />
          <Input
            label="Класс"
            labelSuffix="(опционально)"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            placeholder="9"
          />
        </div>

        <Input
          label="Адрес"
          labelSuffix="(опционально)"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Улица, дом, квартира"
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Дополнительная информация
            <span className="ml-1 text-[#8c95a3]">(опционально)</span>
          </label>
          <textarea
            rows={3}
            value={additionalInfo}
            onChange={(event) => setAdditionalInfo(event.target.value)}
            placeholder="Дополнительные сведения"
            className="crm-textarea resize-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Комментарий
            <span className="ml-1 text-[#8c95a3]">(опционально)</span>
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Комментарий менеджера"
            className="crm-textarea resize-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Заметки
            <span className="ml-1 text-[#8c95a3]">(опционально)</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Внутренние заметки"
            className="crm-textarea resize-none"
          />
        </div>
      </div>
    </Modal>
  );
};
