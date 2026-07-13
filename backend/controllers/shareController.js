const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

exports.getSharedData = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ shareToken: token, isSharingEnabled: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Shared dashboard not found or sharing has been disabled.' });
    }

    const [accounts, transactions] = await Promise.all([
      Account.find({ userId: user._id }),
      Transaction.find({ userId: user._id })
        .populate('accountId')
        .populate('toAccountId')
        .populate('categoryId')
        .sort({ date: -1 })
    ]);

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: user.name,
          baseCurrency: user.baseCurrency
        },
        accounts,
        transactions
      }
    });
  } catch (error) {
    next(error);
  }
};
