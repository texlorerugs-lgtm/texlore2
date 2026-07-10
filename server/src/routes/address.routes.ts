import { Router } from 'express';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import {
  addressCreateValidators,
  addressUpdateValidators,
  idParam,
} from '@/validators/address.validator';
import {
  getAddresses,
  postAddress,
  patchAddress,
  deleteAddressCtl,
  postSetDefaultAddress,
} from '@/controllers/address.controller';

const router = Router();
router.use(requireUser);

router.get('/', getAddresses);
router.post('/', addressCreateValidators, validate, postAddress);
router.patch('/:id', addressUpdateValidators, validate, patchAddress);
router.delete('/:id', idParam, validate, deleteAddressCtl);
router.post('/:id/default', idParam, validate, postSetDefaultAddress);

export default router;
