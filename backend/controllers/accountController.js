import Account from '../models/Account.js';

export const getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find({ userId: req.user.id });
    res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
};

export const createAccount = async (req, res, next) => {
  try {
    const { name, type, balance, currency, creditLimit, statementDate, dueDate } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Please provide account name and type.' });
    }

    const newAccount = await Account.create({
      userId: req.user.id,
      name,
      type,
      balance: balance || 0.0,
      creditLimit: creditLimit || 0.0,
      statementDate: statementDate || undefined,
      dueDate: dueDate || undefined,
      currency: currency || 'MYR'
    });

    res.status(201).json({ success: true, data: newAccount });
  } catch (error) {
    next(error);
  }
};

export const updateAccount = async (req, res, next) => {
  try {
    const { name, type, balance, currency, creditLimit, statementDate, dueDate } = req.body;
    const account = await Account.findOne({ _id: req.params.id, userId: req.user.id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found or access denied.' });
    }

    if (name) account.name = name;
    if (type) account.type = type;
    if (balance !== undefined) account.balance = balance;
    if (creditLimit !== undefined) account.creditLimit = creditLimit;
    if (statementDate !== undefined) account.statementDate = statementDate;
    if (dueDate !== undefined) account.dueDate = dueDate;
    if (currency) account.currency = currency;

    await account.save();
    res.status(200).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const account = await Account.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found or access denied.' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
