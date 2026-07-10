import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Mail, Lock, User, KeyRound, ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/components/ui/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { adminAuthApi } from '@/services/admin-auth.service';
import { useAppDispatch } from '@/store';
import { setAdmin } from '@/store/auth.slice';

interface FormValues {
  name: string;
  email: string;
  password: string;
  secretKey: string;
}

const RESEND_SECONDS = 60;

/**
 * Admin 5-factor login (Part 3):
 *   Step 1: Name + Email + Password + Secret Key -> backend sends OTP
 *   Step 2: OTP entry -> tokens issued
 *
 * This page must NOT be linked from anywhere public.
 */
export default function AdminLoginPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', email: '', password: '', secretKey: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function submitFactors(values: FormValues): Promise<void> {
    setSubmitting(true);
    try {
      await adminAuthApi.prepare(values);
      toast.success('Verification code sent to your admin email');
      setStep('otp');
      setCooldown(RESEND_SECONDS);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid admin credentials.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function verify(): Promise<void> {
    if (otp.length < 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      const email = getValues('email');
      const { admin, accessToken } = await adminAuthApi.verify({ email, code: otp });
      dispatch(setAdmin({ admin, accessToken }));
      toast.success('Admin access granted');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid or expired code.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function resend(): Promise<void> {
    if (cooldown > 0) return;
    // For admin resend, re-submit the factors to re-issue the OTP.
    const values = getValues();
    try {
      await adminAuthApi.prepare(values);
      toast.success('New code sent');
      setCooldown(RESEND_SECONDS);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not resend code.';
      toast.error(msg);
    }
  }

  return (
    <AuthShell
      darkTheme
      title={step === 'form' ? 'Admin sign in' : 'Verify admin access'}
      subtitle={
        step === 'form'
          ? 'Restricted access. All five factors are required.'
          : `Enter the 6-digit code sent to ${getValues('email')}.`
      }
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit(submitFactors)} className="space-y-4" noValidate>
          <Input
            label="Full name"
            leftIcon={<User size={18} />}
            placeholder="Registered admin name"
            autoComplete="off"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Admin email"
            type="email"
            leftIcon={<Mail size={18} />}
            placeholder="admin@texlore.com"
            autoComplete="off"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
            })}
          />
          <Input
            label="Password"
            passwordToggle
            leftIcon={<Lock size={18} />}
            placeholder="Admin password"
            autoComplete="off"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />
          <Input
            label="Secret key"
            passwordToggle
            leftIcon={<KeyRound size={18} />}
            placeholder="Admin secret key"
            autoComplete="off"
            error={errors.secretKey?.message}
            {...register('secretKey', { required: 'Secret key is required' })}
          />
          <Button
            type="submit"
            variant="gold"
            fullWidth
            loading={submitting}
            leftIcon={<ShieldCheck size={18} />}
          >
            Continue
          </Button>
          <p className="text-xs text-charcoal-400 text-center">
            After 5 failed attempts your account is locked for 15 minutes.
          </p>
        </form>
      ) : (
        <div className="space-y-6">
          <OtpInput value={otp} onChange={setOtp} autoFocus />
          <Button type="button" variant="gold" fullWidth loading={submitting} onClick={verify}>
            Verify & sign in
          </Button>
          <div className="text-center text-sm text-charcoal-400">
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0}
              className="text-midnight-900 font-medium hover:text-gold-600 disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
            <span className="mx-2 text-line">·</span>
            <button
              type="button"
              onClick={() => setStep('form')}
              className="text-midnight-900 hover:text-gold-600"
            >
              Edit credentials
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
