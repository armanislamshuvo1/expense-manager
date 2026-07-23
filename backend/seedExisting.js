import User from './models/User.js';
import Category from './models/Category.js';
import Account from './models/Account.js';

const seedExistingUsers = async () => {
  try {
    const users = await User.find({});
    console.log(`Checking defaults seeding for ${users.length} existing users...`);
    for (const user of users) {
      const baseCurrency = user.baseCurrency || 'USD';

      // Check categories
      const categoryCount = await Category.countDocuments({ userId: user._id });
      if (categoryCount === 0) {
        const defaultCategories = [
          { name: 'Salary', emoji: '💰', type: 'INCOME', color: '#10b981' },
          { name: 'Bonus', emoji: '🎁', type: 'INCOME', color: '#3b82f6' },
          { name: 'Allowance', emoji: '💵', type: 'INCOME', color: '#f59e0b' },
          { name: 'Food', emoji: '🍔', type: 'EXPENSE', color: '#ef4444' },
          { name: 'Shopping', emoji: '🛍️', type: 'EXPENSE', color: '#ec4899' },
          { name: 'Travel', emoji: '✈️', type: 'EXPENSE', color: '#06b6d4' },
          { name: 'Home expenses', emoji: '🏠', type: 'EXPENSE', color: '#8b5cf6' }
        ];
        await Category.insertMany(defaultCategories.map(cat => ({ ...cat, userId: user._id })));
        console.log(`Seeded categories for existing user ${user.email}`);
      }

      // Check accounts
      const accountCount = await Account.countDocuments({ userId: user._id });
      if (accountCount === 0) {
        const defaultAccounts = [
          { name: 'Cash', type: 'CASH', balance: 0.0, currency: baseCurrency },
          { name: 'Bank Account', type: 'SAVINGS', balance: 0.0, currency: baseCurrency },
          { name: 'Card', type: 'CARD', balance: 0.0, currency: baseCurrency }
        ];
        await Account.insertMany(defaultAccounts.map(acc => ({ ...acc, userId: user._id })));
        console.log(`Seeded accounts for existing user ${user.email}`);
      }
    }
    console.log('Existing users seeding check completed!');
  } catch (error) {
    console.error('Error seeding existing users:', error);
  }
};

export default seedExistingUsers;
