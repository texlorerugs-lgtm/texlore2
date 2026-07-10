import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';
import type { CartSnapshot } from '@/types/commerce';

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export interface CreatePaymentResponse {
  payment: {
    id: string;
    gatewayOrderId: string;
    amount: number;
    amountMinor: number;
    currency: 'INR' | 'USD';
    razorpayKeyId: string;
  };
  quote: CartSnapshot;
  user: { name: string; email: string; phone: string; countryCode: string };
}

export const paymentApi = {
  createOrder: (addressId: string) =>
    unwrap<CreatePaymentResponse>(http.post('/payments/create-order', { addressId })),

  verify: (body: {
    gatewayOrderId: string;
    gatewayPaymentId: string;
    signature: string;
  }) =>
    unwrap<{ orderNumber: string; orderId: string }>(http.post('/payments/verify', body)),

  fail: (body: { gatewayOrderId: string; reason?: string }) =>
    http.post('/payments/fail', body),
};
