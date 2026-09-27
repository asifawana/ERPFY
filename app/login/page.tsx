import type { Metadata } from 'next';
import ModernLoginSignup from '@/components/ui/modern-login-signup';

export const metadata: Metadata = {
  title: 'Log in to ERPFY',
  description: 'Sign in to your ERPFY account or start your 14-day free trial.',
};

export default function LoginPage() {
  return <ModernLoginSignup />;
}
