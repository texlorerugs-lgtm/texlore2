import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Mail, Lock } from 'lucide-react';
import { AuthShell } from '@/components/ui/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { authApi } from '@/services/auth.service';

type Step = 'email' | 'reset';

const RESEND_SECONDS = 60;

/**
 * Forgot password:
 *   1) Enter email -> backend sends OTP (or silently no-ops for unknown emails)
 *   2) Enter OTP + new password + confirm
 *   3) Backend invalidates all existing refresh tokens
 */
export default function ForgotPasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const emailForm = useForm<{ email: string }>({ defaultValues: { email: '' } });
  const resetForm = useForm<{ newPassword: string; confirmPassword: string }>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function requestOtp(values: { email: string }): Promise<void> {
    setSubmitting(true);
    try {
      await authApi.forgotRequest(values.email);
      toast.success('If that email exists, a reset code was sent.');
      setEmail(values.email);
      setStep('reset');
      setCooldown(RESEND_SECONDS);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not send reset code.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReset(values: {
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    if (otp.length < 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.forgotReset({
        email,
        code: otp,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not reset password.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function resend(): Promise<void> {
    if (cooldown > 0 || !email) return;
    try {
      await authApi.forgotRequest(email);
      toast.success('New code sent');
      setCooldown(RESEND_SECONDS);
    } catch {
      /* ignore */
    }
  }

  const pw = resetForm.watch('newPassword');

  return (
    <AuthShell
      title={step === 'email' ? 'Reset your password' : 'Set a new password'}
      subtitle={
        step === 'email'
          ? 'Enter the email on your account. We\u2019ll send you a verification code.'
          : `We sent a 6-digit code to ${email}. Enter it and choose a new password.`
      }
      footer={
        <Link to="/login" className="text-midnight-900 font-medium hover:text-gold-600">
          Back to sign in
        </Link>
      }
    >
      {step === 'email' ? (
        <form onSubmit={emailForm.handleSubmit(requestOtp)} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            leftIcon={<Mail size={18} />}
            placeholder="you@example.com"
            autoComplete="email"
            error={emailForm.formState.errors.email?.message}
            {...emailForm.register('email', {
              required: 'Email is required',
              pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
            })}
          />
          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Send reset code
          </Button>
        </form>
      ) : (
        <form onSubmit={resetForm.handleSubmit(submitReset)} className="space-y-4" noValidate>
          <OtpInput value={otp} onChange={setOtp} autoFocus />
          <Input
            label="New password"
            passwordToggle
            leftIcon={<Lock size={18} />}
            placeholder="At least 8 characters"
            hint="Include upper, lower, number, special character."
            error={resetForm.formState.errors.newPassword?.message}
            {...resetForm.register('newPassword', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
              validate: (v) =>
                /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v)
                  ? true
                  : 'Include upper, lower, number and special character',
            })}
          />
          <Input
            label="Confirm new password"
            passwordToggle
            leftIcon={<Lock size={18} />}
            placeholder="Retype password"
            error={resetForm.formState.errors.confirmPassword?.message}
            {...resetForm.register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v) => v === pw || 'Passwords do not match',
            })}
          />
          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Update password
          </Button>
          <div className="text-center text-sm text-charcoal-400">
            Didn&rsquo;t receive it?{' '}
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0}
              className="text-midnight-900 font-medium hover:text-gold-600 disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
