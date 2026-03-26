/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import {
  STUDENT_GENDER_OPTIONS,
  STUDENT_STATUS_OPTIONS,
} from '@/constants/student';
import { filesService, type CreateStudentRequest, type UpdateStudentRequest } from '@/lib/api';
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
    discount: '',
    comment: '',
    stateOrderParticipant: false,
    loyalty: '',
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

  const [fullName, setFullName] = useState(defaults.fullName);
  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [middleName, setMiddleName] = useState(defaults.middleName);
  const [customer, setCustomer] = useState(defaults.customer);
  const [studentPhoto] = useState(defaults.studentPhoto);
  const [email, setEmail] = useState(defaults.email);
  const [phone, setPhone] = useState(defaults.phone);
  const [studentPhone, setStudentPhone] = useState(defaults.studentPhone);
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
  const [discount, setDiscount] = useState(defaults.discount);
  const [comment, setComment] = useState(defaults.comment);
  const [stateOrderParticipant, setStateOrderParticipant] = useState(defaults.stateOrderParticipant);
  const [loyalty, setLoyalty] = useState(defaults.loyalty);
  const [additionalPhones, setAdditionalPhones] = useState(defaults.additionalPhones);
  const [notes, setNotes] = useState(defaults.notes);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const photoPreviewUrl = useMemo(() => {
    if (!selectedPhotoFile) {
      return studentPhoto || '';
    }

    return URL.createObjectURL(selectedPhotoFile);
  }, [selectedPhotoFile, studentPhoto]);

  useEffect(() => {
    if (!selectedPhotoFile) {
      return;
    }

    return () => {
      URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl, selectedPhotoFile]);

  const buildPayload = async (): Promise<CreateStudentRequest | UpdateStudentRequest> => {
    let uploadedPhotoUrl = studentPhoto.trim() || undefined;

    if (selectedPhotoFile) {
      setIsUploadingPhoto(true);
      try {
        const uploadResponse = await filesService.upload(selectedPhotoFile, 'avatars');
        uploadedPhotoUrl = uploadResponse.data.url;
      } catch (uploadError) {
        throw new Error(getErrorMessage(uploadError) || 'Не удалось загрузить фото ученика.');
      } finally {
        setIsUploadingPhoto(false);
      }
    }

    return {
      fullName: fullName.trim() || undefined,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      middleName: middleName.trim() || undefined,
      status,
      customer: customer.trim() || undefined,
      studentPhoto: uploadedPhotoUrl,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      studentPhone: studentPhone.trim() || undefined,
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
      discount: discount.trim() || undefined,
      comment: comment.trim() || undefined,
      stateOrderParticipant,
      loyalty: loyalty.trim() || undefined,
      additionalPhones: additionalPhones
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      notes: notes.trim() || undefined,
    };
  };

  const submit = async (handler: (data: CreateStudentRequest | UpdateStudentRequest) => Promise<void> | void) => {
    setError(null);

    if (!fullName.trim() && (!firstName.trim() || !lastName.trim())) {
      setError('Укажите либо полное ФИО, либо отдельно имя и фамилию.');
      return;
    }

    try {
      const payload = await buildPayload();
      await handler(payload);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
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

        <Input
          label="Полное ФИО"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Можно указать полное ФИО одной строкой"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Фамилия"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Иванов"
          />
          <Input
            label="Имя"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Иван"
          />
          <Input
            label="Отчество"
            value={middleName}
            onChange={(event) => setMiddleName(event.target.value)}
            placeholder="Иванович"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Заказчик / customer"
            value={customer}
            onChange={(event) => setCustomer(event.target.value)}
            placeholder="Заказчик или плательщик"
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-[#5d6676]">Фото ученика</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setSelectedPhotoFile(event.target.files?.[0] ?? null)}
              className="block h-11 w-full rounded-xl border border-[#dbe2e8] bg-white px-3 py-2 text-sm text-[#3d4756] file:mr-3 file:rounded-lg file:border-0 file:bg-[#eef4f8] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#3d4756]"
            />
            {photoPreviewUrl ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#e2e8ee] bg-[#f8fbfd] p-3">
                <img
                  src={photoPreviewUrl}
                  alt="Фото ученика"
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div className="text-sm text-[#5d6676]">
                  <p className="font-medium text-[#273142]">
                    {selectedPhotoFile ? selectedPhotoFile.name : 'Текущее фото'}
                  </p>
                  <p className="mt-1 text-xs text-[#7f8794]">
                    Новое фото будет загружено при сохранении формы.
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#7f8794]">Фото пока не выбрано.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Телефон"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+7 777 000 00 00"
          />
          <Input
            label="Телефон ученика"
            value={studentPhone}
            onChange={(event) => setStudentPhone(event.target.value)}
            placeholder="+7 777 111 11 11"
          />
          <Input
            label="Доп. телефоны"
            value={additionalPhones}
            onChange={(event) => setAdditionalPhones(event.target.value)}
            placeholder="+7..., +7..."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@example.com"
          />
          <Input
            label="Дата рождения"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
          <Select
            label="Пол"
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
            value={parentName}
            onChange={(event) => setParentName(event.target.value)}
            placeholder="ФИО родителя"
          />
          <Input
            label="Телефон родителя"
            value={parentPhone}
            onChange={(event) => setParentPhone(event.target.value)}
            placeholder="+7 777 222 22 22"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Город"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Алматы"
          />
          <Input
            label="Школа"
            value={school}
            onChange={(event) => setSchool(event.target.value)}
            placeholder="Школа №12"
          />
          <Input
            label="Класс"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            placeholder="9"
          />
        </div>

        <Input
          label="Адрес"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Улица, дом, квартира"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            label="Договор"
            value={contract}
            onChange={(event) => setContract(event.target.value)}
            placeholder="DOG-2026-001"
          />
          <Input
            label="Скидка"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            placeholder="10"
          />
          <Input
            label="Лояльность"
            value={loyalty}
            onChange={(event) => setLoyalty(event.target.value)}
            placeholder="GOLD"
          />
          <label className="flex items-end">
            <span className="flex h-11 w-full items-center gap-3 rounded-xl border border-[#dbe2e8] bg-white px-3 text-sm text-[#3d4756]">
              <input
                type="checkbox"
                checked={stateOrderParticipant}
                onChange={(event) => setStateOrderParticipant(event.target.checked)}
              />
              Госзаказ
            </span>
          </label>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Дополнительная информация</label>
          <textarea
            rows={3}
            value={additionalInfo}
            onChange={(event) => setAdditionalInfo(event.target.value)}
            placeholder="Дополнительные сведения"
            className="crm-textarea resize-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Комментарий</label>
          <textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Комментарий менеджера"
            className="crm-textarea resize-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Заметки</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Внутренние заметки"
            className="crm-textarea resize-none"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
