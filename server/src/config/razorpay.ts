/**
 * Razorpay client — supports INR (domestic) and USD (international).
 * Signature verification lives in services/payment.service.ts (M5).
 */
import Razorpay from 'razorpay';
import { env } from '@/config/env';

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export const RAZORPAY_KEY_ID_PUBLIC = env.RAZORPAY_KEY_ID;
