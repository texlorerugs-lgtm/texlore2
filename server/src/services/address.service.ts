/**
 * Address CRUD on the User document. One address may be flagged default;
 * setting a new default automatically unflags the others.
 */
import { Types } from 'mongoose';
import { User } from '@/models/User.model';
import { ApiError } from '@/utils/ApiError';

export interface AddressInput {
  label?: string;
  fullName: string;
  phone: string;
  countryCode?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  country?: string;
  zip: string;
  isDefault?: boolean;
}

function serialize(u: InstanceType<typeof User>): unknown[] {
  return (u.addresses ?? []).map((a) => {
    const { _id, ...rest } = a.toObject();
    return { id: String(_id), ...rest };
  });
}

export async function listAddresses(userId: string): Promise<unknown[]> {
  const u = await User.findById(userId);
  if (!u) throw ApiError.notFound('User not found.');
  return serialize(u);
}

export async function createAddress(userId: string, input: AddressInput): Promise<unknown[]> {
  validate(input);
  const u = await User.findById(userId);
  if (!u) throw ApiError.notFound('User not found.');

  const willBeDefault = input.isDefault || u.addresses.length === 0;
  if (willBeDefault) u.addresses.forEach((a) => (a.isDefault = false));

  u.addresses.push({
    label: input.label ?? 'Home',
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    countryCode: input.countryCode?.trim() || u.countryCode,
    line1: input.line1.trim(),
    line2: input.line2?.trim() ?? '',
    landmark: input.landmark?.trim() ?? '',
    city: input.city.trim(),
    state: input.state.trim(),
    country: input.country?.trim() || 'India',
    zip: input.zip.trim(),
    isDefault: willBeDefault,
  });
  await u.save();
  return serialize(u);
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: Partial<AddressInput>,
): Promise<unknown[]> {
  if (!Types.ObjectId.isValid(addressId)) throw ApiError.badRequest('Invalid address id.');
  const u = await User.findById(userId);
  if (!u) throw ApiError.notFound('User not found.');
  const addr = u.addresses.find((a) => String(a._id) === addressId);
  if (!addr) throw ApiError.notFound('Address not found.');

  if (input.label !== undefined) addr.label = input.label;
  if (input.fullName !== undefined) addr.fullName = input.fullName.trim();
  if (input.phone !== undefined) addr.phone = input.phone.trim();
  if (input.countryCode !== undefined) addr.countryCode = input.countryCode.trim();
  if (input.line1 !== undefined) addr.line1 = input.line1.trim();
  if (input.line2 !== undefined) addr.line2 = input.line2.trim();
  if (input.landmark !== undefined) addr.landmark = input.landmark.trim();
  if (input.city !== undefined) addr.city = input.city.trim();
  if (input.state !== undefined) addr.state = input.state.trim();
  if (input.country !== undefined) addr.country = input.country.trim();
  if (input.zip !== undefined) addr.zip = input.zip.trim();
  if (input.isDefault) {
    u.addresses.forEach((a) => (a.isDefault = false));
    addr.isDefault = true;
  }
  await u.save();
  return serialize(u);
}

export async function deleteAddress(userId: string, addressId: string): Promise<unknown[]> {
  if (!Types.ObjectId.isValid(addressId)) throw ApiError.badRequest('Invalid address id.');
  const u = await User.findById(userId);
  if (!u) throw ApiError.notFound('User not found.');
  const wasDefault = u.addresses.find((a) => String(a._id) === addressId)?.isDefault;
  u.addresses.splice(
    0,
    u.addresses.length,
    ...u.addresses.filter((a) => String(a._id) !== addressId),
  );
  if (wasDefault && u.addresses.length > 0) u.addresses[0].isDefault = true;
  await u.save();
  return serialize(u);
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<unknown[]> {
  if (!Types.ObjectId.isValid(addressId)) throw ApiError.badRequest('Invalid address id.');
  const u = await User.findById(userId);
  if (!u) throw ApiError.notFound('User not found.');
  const addr = u.addresses.find((a) => String(a._id) === addressId);
  if (!addr) throw ApiError.notFound('Address not found.');
  u.addresses.forEach((a) => (a.isDefault = false));
  addr.isDefault = true;
  await u.save();
  return serialize(u);
}

function validate(input: AddressInput): void {
  const required: Array<[string, string | undefined]> = [
    ['fullName', input.fullName],
    ['phone', input.phone],
    ['line1', input.line1],
    ['city', input.city],
    ['state', input.state],
    ['zip', input.zip],
  ];
  for (const [k, v] of required) {
    if (!v || !v.trim()) throw ApiError.badRequest(`${k} is required.`);
  }
  if (!/^\d{6,15}$/.test(input.phone.trim())) {
    throw ApiError.badRequest('Phone must be 6\u201315 digits.');
  }
  if (!/^[A-Za-z0-9\s-]{3,12}$/.test(input.zip.trim())) {
    throw ApiError.badRequest('Enter a valid ZIP / postal code.');
  }
}
