const User = require('../models/User');

const SECRET = () => process.env.PAYSTACK_SECRET_KEY;

const ps = async (path, method = 'GET', body = null) => {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${SECRET()}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`https://api.paystack.co${path}`, opts);
  return r.json();
};

exports.listBanks = async (req, res) => {
  if (!SECRET()) return res.status(503).json({ message: 'Paystack not configured' });
  const data = await ps('/bank?country=nigeria&perPage=100');
  res.json({ banks: data.data || [] });
};

exports.verifyAccount = async (req, res) => {
  if (!SECRET()) return res.status(503).json({ message: 'Paystack not configured' });
  const { accountNumber, bankCode } = req.query;
  if (!accountNumber || !bankCode) return res.status(400).json({ message: 'accountNumber and bankCode required' });
  const data = await ps(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
  if (!data.status) return res.status(400).json({ message: data.message || 'Could not verify account' });
  res.json({ accountName: data.data.account_name });
};

exports.saveBankAccount = async (req, res) => {
  const { bankName, bankCode, accountNumber, accountName } = req.body;
  if (!accountNumber || !bankCode || !accountName) {
    return res.status(400).json({ message: 'bankCode, accountNumber and accountName are required' });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.companyId.toString() !== req.user.companyId.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  user.bankAccount = { bankName, bankCode, accountNumber, accountName, recipientCode: '' };
  await user.save();
  res.json({ message: 'Bank account saved', bankAccount: user.bankAccount });
};

exports.initiateTransfer = async (req, res) => {
  if (!SECRET()) return res.status(503).json({ message: 'Paystack not configured' });

  const { userId, amount, reason } = req.body;
  if (!userId || !amount) return res.status(400).json({ message: 'userId and amount required' });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.companyId.toString() !== req.user.companyId.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const ba = user.bankAccount;
  if (!ba?.accountNumber || !ba?.bankCode) {
    return res.status(400).json({ message: 'This user has no bank account on file' });
  }

  let recipientCode = ba.recipientCode;

  if (!recipientCode) {
    const recip = await ps('/transferrecipient', 'POST', {
      type          : 'nuban',
      name          : ba.accountName || user.name,
      account_number: ba.accountNumber,
      bank_code     : ba.bankCode,
      currency      : 'NGN',
    });
    if (!recip.status) return res.status(502).json({ message: recip.message || 'Could not create recipient' });
    recipientCode = recip.data.recipient_code;
    user.bankAccount.recipientCode = recipientCode;
    await user.save();
  }

  const amountKobo = Math.round(Number(amount) * 100);
  const transfer = await ps('/transfer', 'POST', {
    source    : 'balance',
    amount    : amountKobo,
    recipient : recipientCode,
    reason    : reason || `Payment to ${user.name}`,
    reference : `pay_${user._id}_${Date.now()}`,
  });

  if (!transfer.status) return res.status(502).json({ message: transfer.message || 'Transfer failed' });

  res.json({
    message  : 'Transfer initiated',
    reference: transfer.data.reference,
    status   : transfer.data.status,
  });
};

exports.listTeamBankAccounts = async (req, res) => {
  const members = await User.find({ companyId: req.user.companyId, isActive: true })
    .select('name email role bankAccount');
  res.json({ members, paystackReady: !!SECRET() });
};
