require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Account = require('./models/Account');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const connectDB = require('./config/db');

const demoEmail = 'alex.rivera@nexuswealth.com';
const demoPassword = 'DemoPassword123!';

const seedDemoUser = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log(`Checking if demo user ${demoEmail} already exists...`);
    let user = await User.findOne({ email: demoEmail });

    if (user) {
      console.log('Demo user exists. Cleaning up old data to prevent duplication...');
      await Transaction.deleteMany({ userId: user._id });
      await Category.deleteMany({ userId: user._id });
      await Account.deleteMany({ userId: user._id });
      // Keep user ID but reset theme & settings
      user.name = 'Alex Rivera';
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(demoPassword, salt);
      user.baseCurrency = 'USD';
      user.preferredCurrencies = ['USD', 'EUR', 'GBP'];
      user.theme = 'dark';
      await user.save();
    } else {
      console.log('Creating new demo user...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(demoPassword, salt);
      user = new User({
        email: demoEmail,
        name: 'Alex Rivera',
        passwordHash,
        baseCurrency: 'USD',
        preferredCurrencies: ['USD', 'EUR', 'GBP'],
        theme: 'dark'
      });
      await user.save();
    }

    console.log(`Demo user created/reset successfully with ID: ${user._id}`);

    // Create Categories
    console.log('Seeding categories...');
    const categoriesData = [
      // Income
      { name: 'Salary', emoji: '💰', type: 'INCOME', color: '#10b981' },
      { name: 'Dividends', emoji: '📈', type: 'INCOME', color: '#3b82f6' },
      { name: 'Freelance', emoji: '💻', type: 'INCOME', color: '#8b5cf6' },
      // Expense
      { name: 'Food & Dining', emoji: '🍔', type: 'EXPENSE', color: '#ef4444' },
      { name: 'Shopping', emoji: '🛍️', type: 'EXPENSE', color: '#ec4899' },
      { name: 'Travel & Ride', emoji: '✈️', type: 'EXPENSE', color: '#06b6d4' },
      { name: 'Subscribes', emoji: '📺', type: 'EXPENSE', color: '#f59e0b' },
      { name: 'Housing', emoji: '🏠', type: 'EXPENSE', color: '#6b7280' },
      { name: 'Investment/Crypto', emoji: '🪙', type: 'EXPENSE', color: '#a855f7' }
    ];

    const seededCategories = await Category.insertMany(
      categoriesData.map(cat => ({ ...cat, userId: user._id }))
    );
    console.log(`Seeded ${seededCategories.length} categories.`);

    // Find category objects for mapping
    const getCat = (name) => seededCategories.find(c => c.name === name)._id;

    // Create Accounts
    console.log('Seeding accounts...');
    const accountsData = [
      { name: 'Chase Checking 🏦', type: 'SAVINGS', balance: 5420.50, currency: 'USD' },
      { name: 'Robinhood Portfolio 📈', type: 'INVESTMENT', balance: 24150.75, currency: 'USD' },
      { name: 'Amex Gold Card 💳', type: 'CARD', balance: -850.20, currency: 'USD' },
      { name: 'Cash Wallet 💵', type: 'CASH', balance: 340.00, currency: 'USD' }
    ];

    const seededAccounts = await Account.insertMany(
      accountsData.map(acc => ({ ...acc, userId: user._id }))
    );
    console.log(`Seeded ${seededAccounts.length} accounts.`);

    const getAcc = (name) => seededAccounts.find(a => a.name === name);

    // Create Transactions over the last 30 days
    console.log('Seeding transactions...');
    const baseDate = new Date();
    // Helper to get date relative to today
    const daysAgo = (days) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - days);
      return d;
    };

    const chase = getAcc('Chase Checking 🏦');
    const robinhood = getAcc('Robinhood Portfolio 📈');
    const amex = getAcc('Amex Gold Card 💳');
    const cash = getAcc('Cash Wallet 💵');

    const transactionsData = [
      // Salary (Income)
      {
        accountId: chase._id,
        categoryId: getCat('Salary'),
        type: 'INCOME',
        amount: 3200.00,
        currency: 'USD',
        date: daysAgo(28),
        description: 'Bi-Weekly Paycheck',
        note: 'NexusWealth Inc. direct deposit'
      },
      {
        accountId: chase._id,
        categoryId: getCat('Salary'),
        type: 'INCOME',
        amount: 3200.00,
        currency: 'USD',
        date: daysAgo(14),
        description: 'Bi-Weekly Paycheck',
        note: 'NexusWealth Inc. direct deposit'
      },
      // Freelance Income
      {
        accountId: chase._id,
        categoryId: getCat('Freelance'),
        type: 'INCOME',
        amount: 1250.00,
        currency: 'USD',
        date: daysAgo(20),
        description: 'Web Design Freelance',
        note: 'Contract work for Acme Corp'
      },
      // Dividends Income
      {
        accountId: robinhood._id,
        categoryId: getCat('Dividends'),
        type: 'INCOME',
        amount: 145.20,
        currency: 'USD',
        date: daysAgo(10),
        description: 'Quarterly Apple Dividend',
        note: 'AAPL stock payout'
      },
      // Housing (Expense)
      {
        accountId: chase._id,
        categoryId: getCat('Housing'),
        type: 'EXPENSE',
        amount: 1850.00,
        currency: 'USD',
        date: daysAgo(27),
        description: 'Monthly Rent',
        note: 'Appt 4B rental payment'
      },
      // Food & Dining
      {
        accountId: amex._id,
        categoryId: getCat('Food & Dining'),
        type: 'EXPENSE',
        amount: 145.30,
        currency: 'USD',
        date: daysAgo(25),
        description: 'Whole Foods Market',
        note: 'Weekly organic groceries'
      },
      {
        accountId: cash._id,
        categoryId: getCat('Food & Dining'),
        type: 'EXPENSE',
        amount: 7.85,
        currency: 'USD',
        date: daysAgo(24),
        description: 'Starbucks Coffee',
        note: 'Caramel Macchiato'
      },
      {
        accountId: amex._id,
        categoryId: getCat('Food & Dining'),
        type: 'EXPENSE',
        amount: 280.00,
        currency: 'USD',
        date: daysAgo(18),
        description: 'Dinner at Nobu',
        note: 'Celebration dinner with clients'
      },
      {
        accountId: cash._id,
        categoryId: getCat('Food & Dining'),
        type: 'EXPENSE',
        amount: 12.50,
        currency: 'USD',
        date: daysAgo(15),
        description: 'Sweetgreen Salad',
        note: 'Lunch break'
      },
      {
        accountId: amex._id,
        categoryId: getCat('Food & Dining'),
        type: 'EXPENSE',
        amount: 62.40,
        currency: 'USD',
        date: daysAgo(8),
        description: 'UberEats Delivery',
        note: 'Italian pasta dinner'
      },
      {
        accountId: cash._id,
        categoryId: getCat('Food & Dining'),
        type: 'EXPENSE',
        amount: 9.50,
        currency: 'USD',
        date: daysAgo(3),
        description: 'Blue Bottle Coffee',
        note: 'Espresso single origin'
      },
      // Shopping
      {
        accountId: amex._id,
        categoryId: getCat('Shopping'),
        type: 'EXPENSE',
        amount: 1099.00,
        currency: 'USD',
        date: daysAgo(23),
        description: 'Apple Store (iPad Pro)',
        note: 'New M4 iPad Pro for productivity'
      },
      {
        accountId: amex._id,
        categoryId: getCat('Shopping'),
        type: 'EXPENSE',
        amount: 85.40,
        currency: 'USD',
        date: daysAgo(12),
        description: 'Amazon.com',
        note: 'Financial books & desk accessory'
      },
      {
        accountId: chase._id,
        categoryId: getCat('Shopping'),
        type: 'EXPENSE',
        amount: 350.00,
        currency: 'USD',
        date: daysAgo(5),
        description: 'Acoustic Guitar',
        note: 'Second-hand Taylor GS Mini'
      },
      // Travel & Ride
      {
        accountId: amex._id,
        categoryId: getCat('Travel & Ride'),
        type: 'EXPENSE',
        amount: 24.50,
        currency: 'USD',
        date: daysAgo(22),
        description: 'Uber Ride',
        note: 'Uber to airport'
      },
      {
        accountId: amex._id,
        categoryId: getCat('Travel & Ride'),
        type: 'EXPENSE',
        amount: 650.00,
        currency: 'USD',
        date: daysAgo(21),
        description: 'Delta Airlines',
        note: 'Flight ticket NYC to SF'
      },
      {
        accountId: amex._id,
        categoryId: getCat('Travel & Ride'),
        type: 'EXPENSE',
        amount: 420.00,
        currency: 'USD',
        date: daysAgo(19),
        description: 'Hilton Hotels',
        note: '2-night business stay'
      },
      {
        accountId: amex._id,
        categoryId: getCat('Travel & Ride'),
        type: 'EXPENSE',
        amount: 45.00,
        currency: 'USD',
        date: daysAgo(13),
        description: 'Chevron Gas Station',
        note: 'Fuel refill for rental car'
      },
      // Subscriptions
      {
        accountId: amex._id,
        categoryId: getCat('Subscribes'),
        type: 'EXPENSE',
        amount: 19.99,
        currency: 'USD',
        date: daysAgo(26),
        description: 'Netflix Premium',
        note: 'Monthly video streaming'
      },
      {
        accountId: amex._id,
        categoryId: getCat('Subscribes'),
        type: 'EXPENSE',
        amount: 14.99,
        currency: 'USD',
        date: daysAgo(26),
        description: 'Spotify Family',
        note: 'Music streaming subscription'
      },
      {
        accountId: amex._id,
        categoryId: getCat('Subscribes'),
        type: 'EXPENSE',
        amount: 180.00,
        currency: 'USD',
        date: daysAgo(25),
        description: 'Equinox Gym Membership',
        note: 'Monthly fitness access'
      },
      {
        accountId: amex._id,
        categoryId: getCat('Subscribes'),
        type: 'EXPENSE',
        amount: 20.00,
        currency: 'USD',
        date: daysAgo(2),
        description: 'ChatGPT Plus',
        note: 'AI productivity subscription'
      },
      // Investment / Crypto
      {
        accountId: chase._id,
        categoryId: getCat('Investment/Crypto'),
        type: 'EXPENSE',
        amount: 500.00,
        currency: 'USD',
        date: daysAgo(6),
        description: 'Bitcoin Purchase',
        note: 'DCA weekly purchase'
      }
    ];

    // We also want to add some transfers to make the portfolio look interesting.
    // Let's add a transfer from Chase Checking to Robinhood
    transactionsData.push({
      accountId: chase._id,
      toAccountId: robinhood._id,
      type: 'TRANSFER',
      amount: 1000.00,
      currency: 'USD',
      date: daysAgo(17),
      description: 'Transfer to Brokerage',
      note: 'Funding investment account'
    });

    // Let's insert the transactions
    const transactionsToInsert = transactionsData.map(tx => {
      // Calculate convertedAmount
      const convertedAmount = tx.amount;
      return {
        ...tx,
        userId: user._id,
        convertedAmount,
        shouldConvert: true,
        exchangeRate: 1.0
      };
    });

    const seededTransactions = await Transaction.insertMany(transactionsToInsert);
    console.log(`Seeded ${seededTransactions.length} transactions.`);

    // Recalculate balances starting from initial values.
    const startBalances = {
      'Chase Checking 🏦': 4500.00,
      'Robinhood Portfolio 📈': 22800.00,
      'Amex Gold Card 💳': -150.00,
      'Cash Wallet 💵': 400.00
    };

    const finalBalances = { ...startBalances };

    for (const tx of transactionsToInsert) {
      const fromAccName = seededAccounts.find(a => a._id.toString() === tx.accountId.toString()).name;
      if (tx.type === 'INCOME') {
        finalBalances[fromAccName] += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        finalBalances[fromAccName] -= tx.amount;
      } else if (tx.type === 'TRANSFER') {
        const toAccName = seededAccounts.find(a => a._id.toString() === tx.toAccountId.toString()).name;
        finalBalances[fromAccName] -= tx.amount;
        finalBalances[toAccName] += tx.amount;
      }
    }

    // Update the DB with the correct final balances so that they are mathematically consistent
    console.log('Recalculating and updating account balances in DB...');
    for (const acc of seededAccounts) {
      const finalBal = Number(finalBalances[acc.name].toFixed(2));
      await Account.findByIdAndUpdate(acc._id, { balance: finalBal });
      console.log(`- ${acc.name}: ${finalBal}`);
    }

    console.log('\n======================================================');
    console.log('DEMO ACCOUNT SEEDED SUCCESSFULLY!');
    console.log('------------------------------------------------------');
    console.log(`Email:    ${demoEmail}`);
    console.log(`Password: ${demoPassword}`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding demo user:', error);
    process.exit(1);
  }
};

seedDemoUser();
