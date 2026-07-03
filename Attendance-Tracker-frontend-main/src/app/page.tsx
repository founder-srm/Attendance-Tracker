import { redirect } from 'next/navigation';

export default function HomePage() {
  // Automatically route base URL to the login system
  redirect('/login');
}