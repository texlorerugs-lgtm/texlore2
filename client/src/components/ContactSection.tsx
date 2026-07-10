import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Mail, MessageSquare, User, Phone, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { contactApi, type ContactInput } from '@/services/contact.service';

/**
 * The one and only Get-in-Touch form. Renders only on the Home page.
 * Backend saves the message even if email delivery to the admin fails,
 * so this form is highly resilient.
 */
export function ContactSection(): JSX.Element {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    defaultValues: { name: '', email: '', countryCode: '+91', phone: '', message: '' },
  });

  async function onSubmit(values: ContactInput): Promise<void> {
    try {
      await contactApi.submit(values);
      setSubmitted(true);
      reset();
      toast.success('Thanks — we\u2019ll be in touch shortly.');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not send message. Please try again.',
      );
    }
  }

  return (
    <section id="contact" className="bg-midnight-900 text-ivory">
      <div className="container-lux py-20 grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <p className="text-xs tracking-[0.3em] text-gold-500 mb-3">GET IN TOUCH</p>
          <h2 className="font-display text-4xl sm:text-5xl mb-4 text-ivory">
            Talk to a Texlore consultant
          </h2>
          <p className="text-ivory/70 mb-8 max-w-md leading-relaxed">
            Questions about a specific rug, custom commissions, or bulk orders for
            hotels and offices — we\u2019d love to help.
          </p>
          <ul className="space-y-3 text-sm text-ivory/80">
            <li className="flex items-center gap-3">
              <Mail size={16} className="text-gold-500" /> texlorerugs@gmail.com
            </li>
            <li className="flex items-center gap-3">
              <MessageSquare size={16} className="text-gold-500" /> Typical reply within 24 hours
            </li>
          </ul>
        </div>

        <div className="card !bg-pearl p-6 sm:p-8 text-charcoal-500">
          {submitted ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-display text-2xl text-midnight-900 mb-2">Message sent</h3>
              <p className="text-charcoal-400 mb-6">
                Our team has received your note and will reply shortly.
              </p>
              <Button variant="ghost" onClick={() => setSubmitted(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input
                label="Your name"
                leftIcon={<User size={16} />}
                error={errors.name?.message}
                {...register('name', { required: 'Name is required', maxLength: 120 })}
              />
              <Input
                label="Email"
                type="email"
                leftIcon={<Mail size={16} />}
                error={errors.email?.message}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
                })}
              />
              <div className="grid grid-cols-[100px_1fr] gap-3">
                <Input label="Code" placeholder="+91" {...register('countryCode')} />
                <Input
                  label="Phone (optional)"
                  leftIcon={<Phone size={16} />}
                  error={errors.phone?.message}
                  {...register('phone', {
                    pattern: { value: /^\d{6,15}$/, message: '6\u201315 digits' },
                  })}
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-charcoal-500">Message</label>
                <textarea
                  {...register('message', {
                    required: 'Message is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                    maxLength: 5000,
                  })}
                  rows={5}
                  className="w-full rounded-xl border border-line bg-pearl px-3 py-3 text-charcoal-500 outline-none
                             focus:border-midnight-900 focus:ring-2 focus:ring-midnight-900/10 transition-all"
                  placeholder="Tell us what you\u2019re looking for..."
                />
                {errors.message?.message && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.message.message}</p>
                )}
              </div>
              <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
                Send message
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
