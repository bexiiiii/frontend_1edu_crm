import { redirect } from 'next/navigation';

export default function ServiceUnavailablePage() {
  redirect('/system/service-unavailable');
}

