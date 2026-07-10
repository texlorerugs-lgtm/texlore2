import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Mail, Lock } from 'lucide-react';
import { AuthShell } from '@/components/ui/AuthShell';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/services/auth.service';
import { useAppDispatch } from '@/store';
import { setUser } from '@/store/auth.slice';

interface FormValues {
  email: string;
  password: string;
}

/**
 * User login. On success we navigate back to the location the user tried to
 * access before being bounced here (see `RequireAuth` in later milestones),
 * defaulting to Home.
 */
export default function LoginPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { email: '', password: '' } });

  async function onSubmit(values: FormValues): Promise<void> {
    setSubmitting(true);
    try {
      const { user, accessToken } = await authApi.login(values);
      dispatch(setUser({ user, accessToken }));
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate(returnTo, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to sign in. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your Texlore journey."
      footer={
        <>
          New to Texlore?{' '}
          <Link to="/signup" className="text-midnight-900 font-medium hover:text-gold-600">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          leftIcon={<Mail size={18} />}
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
          })}
        />
        <Input
          label="Password"
          passwordToggle
          autoComplete="current-password"
          leftIcon={<Lock size={18} />}
          placeholder="Your password"
          error={errors.password?.message}
          {...register('password', { required: 'Password is required' })}
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-charcoal-400 cursor-pointer">
            <input type="checkbox" className="rounded border-line" />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-midnight-900 hover:text-gold-600">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" variant="primary" fullWidth loading={submitting}>
          Sign In
        </Button>
      </form>
    </AuthShell>
  );
}
