import { redirect } from 'next/navigation';

export default function UnderDevelopmentPage() {
  redirect('/system/under-development');
}

