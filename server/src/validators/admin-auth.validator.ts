import { body } from 'express-validator';

export const adminPreLoginValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
  body('secretKey').isString().notEmpty(),
];

export const adminVerifyValidators = [
  body('email').trim().isEmail().normalizeEmail(),
  body('code')
    .isString()
    .matches(/^\d{4,8}$/),
];
