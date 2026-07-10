/**
 * express-validator chains for user auth endpoints.
 */
import { body } from 'express-validator';

export const signupRequestValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('countryCode')
    .trim()
    .matches(/^\+\d{1,4}$/)
    .withMessage('Country code must be like +91'),
  body('phone')
    .trim()
    .matches(/^\d{6,15}$/)
    .withMessage('Phone must be 6\u201315 digits'),
  body('password').isString().isLength({ min: 8, max: 128 }),
  body('confirmPassword').isString().isLength({ min: 8, max: 128 }),
];

export const signupVerifyValidators = [
  body('email').trim().isEmail().normalizeEmail(),
  body('code')
    .isString()
    .matches(/^\d{4,8}$/)
    .withMessage('Enter the code sent to your email'),
];

export const resendOtpValidators = [
  body('email').trim().isEmail().normalizeEmail(),
];

export const loginValidators = [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
];

export const forgotRequestValidators = [
  body('email').trim().isEmail().normalizeEmail(),
];

export const forgotResetValidators = [
  body('email').trim().isEmail().normalizeEmail(),
  body('code')
    .isString()
    .matches(/^\d{4,8}$/),
  body('newPassword').isString().isLength({ min: 8, max: 128 }),
  body('confirmPassword').isString().isLength({ min: 8, max: 128 }),
];
