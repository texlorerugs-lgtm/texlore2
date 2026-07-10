import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { AuthShell } from '@/components/ui/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { authApi } from '@/services/auth.service';
import { useAppDispatch } from '@/store';
import { setUser } from '@/store/auth.slice';

interface FormValues {
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const RESEND_SECONDS = 60;

/**
 * Two-step signup:
 *   1) Fill the form, request OTP (backend emails via SMTP)
 *   2) Enter OTP, backend creates the account + signs the user in
 * Backend enforces all validation independently.
 */
export default function SignupPage(): JSX.Element {
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
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      email: '',
      countryCode: '+91',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function sendOtp(values: FormValues): Promise<void> {
    setSubmitting(true);
    try {
      await authApi.signupRequest(values);
      toast.success('Verification code sent to your email');
      setStep('otp');
      setCooldown(RESEND_SECONDS);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not start signup. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(): Promise<void> {
    if (otp.length < 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      const email = getValues('email');
      const { user, accessToken } = await authApi.signupVerify({ email, code: otp });
      dispatch(setUser({ user, accessToken }));
      toast.success('Welcome to Texlore');
      navigate('/', { replace: true });
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
    try {
      await authApi.signupResend(getValues('email'));
      toast.success('New code sent');
      setCooldown(RESEND_SECONDS);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not resend code.';
      toast.error(msg);
    }
  }

  const pw = watch('password');

  return (
    <AuthShell
      title={step === 'form' ? 'Create your account' : 'Verify your email'}
      subtitle={
        step === 'form'
          ? 'Join Texlore to shop premium carpets crafted by master weavers.'
          : `We sent a 6-digit code to ${getValues('email')}. Enter it below to finish.`
      }
      footer={
        step === 'form' ? (
          <>
            Already have an account?{' '}
            <Link to="/login" className="text-midnight-900 font-medium hover:text-gold-600">
              Sign in
            </Link>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setStep('form')}
            className="text-midnight-900 hover:text-gold-600"
          >
            ← Edit details
          </button>
        )
      }
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit(sendOtp)} className="space-y-4" noValidate>
          <Input
            label="Full name"
            leftIcon={<User size={18} />}
            placeholder="Aarav Sharma"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name', { required: 'Full name is required', maxLength: 80 })}
          />
          <Input
            label="Email"
            type="email"
            leftIcon={<Mail size={18} />}
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
            })}
          />
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <Input
              label="Code"
              placeholder="+91"
              error={errors.countryCode?.message}
              {...register('countryCode', {
                required: 'Required',
                pattern: { value: /^\+\d{1,4}$/, message: 'e.g. +91' },
              })}
            />
            <Input
              label="Phone number"
              leftIcon={<Phone size={18} />}
              placeholder="9876543210"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register('phone', {
                required: 'Phone is required',
                pattern: { value: /^\d{6,15}$/, message: '6\u201315 digits' },
              })}
            />
          </div>
          <Input
            label="Password"
            passwordToggle
            leftIcon={<Lock size={18} />}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            hint="Use upper + lower + number + special character."
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
              validate: (v) =>
                /[A-Z]/.test(v) &&
                /[a-z]/.test(v) &&
                /\d/.test(v) &&
                /[^A-Za-z0-9]/.test(v)
                  ? true
                  : 'Include upper, lower, number and special character',
            })}
          />
          <Input
            label="Confirm password"
            passwordToggle
            leftIcon={<Lock size={18} />}
            placeholder="Retype password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v) => v === pw || 'Passwords do not match',
            })}
          />
          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Send verification code
          </Button>
        </form>
      ) : (
        <div className="space-y-6">
          <OtpInput value={otp} onChange={setOtp} autoFocus />
          <Button
            type="button"
            variant="primary"
            fullWidth
            loading={submitting}
            onClick={verifyOtp}
          >
            Verify & create account
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
        </div>
      )}
    </AuthShell>
  );
}
