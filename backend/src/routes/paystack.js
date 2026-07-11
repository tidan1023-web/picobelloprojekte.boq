const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  listBanks, verifyAccount, saveBankAccount,
  initiateTransfer, listTeamBankAccounts,
} = require('../controllers/paystackController');

router.use(authenticate);

router.get('/banks',              listBanks);
router.get('/verify-account',     verifyAccount);
router.get('/team',               listTeamBankAccounts);
router.patch('/users/:id/bank',   saveBankAccount);
router.post('/transfer',          authorize('admin'), initiateTransfer);

module.exports = router;
