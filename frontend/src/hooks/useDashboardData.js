import { useState, useMemo } from 'react';

export function useDashboardData(accounts = [], transactions = [], categories = [], user = null) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [periodType, setPeriodType] = useState('Monthly'); // 'Weekly' | 'Monthly' | 'Yearly' | 'All'
  const [activeTab, setActiveTab] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME'
  const [selectedCategoryTransactions, setSelectedCategoryTransactions] = useState(null);

  const { netWorthData, cashFlowData, categoryData, carryOverBalance } = useMemo(() => {
    const txList = transactions || [];
    const currentAssets = (accounts || []).reduce((sum, acc) => sum + (Number(acc?.balance) || 0), 0);
    const period = periodType;
    const refDate = selectedDate || new Date();
    const currentTab = activeTab;

    let filteredTx = [...txList];
    let carryOverBalance = 0;

    if (period !== 'All') {
      let start, end;
      if (period === 'Weekly') {
        start = new Date(refDate);
        start.setDate(refDate.getDate() - refDate.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
      } else if (period === 'Monthly') {
        const monthlyStartDay = Math.min(31, Math.max(1, Number(user?.settings?.monthlyStartDate) || 1));
        if (monthlyStartDay === 1) {
          start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        } else {
          const currentDay = refDate.getDate();
          if (currentDay >= monthlyStartDay) {
            start = new Date(refDate.getFullYear(), refDate.getMonth(), monthlyStartDay);
          } else {
            start = new Date(refDate.getFullYear(), refDate.getMonth() - 1, monthlyStartDay);
          }
        }
        if (monthlyStartDay === 1) {
          end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);
        } else {
          const currentDay = refDate.getDate();
          if (currentDay >= monthlyStartDay) {
            end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, monthlyStartDay);
          } else {
            end = new Date(refDate.getFullYear(), refDate.getMonth(), monthlyStartDay);
          }
        }
      } else if (period === 'Yearly') {
        start = new Date(refDate.getFullYear(), 0, 1);
        end = new Date(refDate.getFullYear() + 1, 0, 1);
      }
      if (user?.settings?.carryOverEnabled !== false && start) {
        txList.forEach(tx => {
          if (tx && tx.date) {
            const txDate = new Date(tx.date);
            if (txDate < start) {
              const amt = Number(tx.convertedAmount || tx.amount) || 0;
              if (tx.type === 'INCOME') carryOverBalance += amt;
              else if (tx.type === 'EXPENSE') carryOverBalance -= amt;
            }
          }
        });
      }

      filteredTx = txList.filter(tx => {
        if (!tx || !tx.date) return false;
        const txDate = new Date(tx.date);
        return txDate >= start && txDate < end;
      });
    }

    // 1. Net Worth Pacing Chart (Assets vs Liabilities / Cumulative)
    let runningTotal = currentAssets;
    const sortedTx = [...txList].filter(t => t && t.date).sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

    // Create a time series for net worth tracking
    const pacingMap = {};
    const todayStr = new Date().toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    pacingMap[todayStr] = runningTotal;

    sortedTx.forEach(tx => {
      const dateKey = new Date(tx.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      const amt = Number(tx.convertedAmount || tx.amount) || 0;
      if (tx.type === 'INCOME') {
        runningTotal -= amt;
      } else if (tx.type === 'EXPENSE') {
        runningTotal += amt;
      }
      pacingMap[dateKey] = runningTotal;
    });

    // Calculate real dynamic liabilities from credit accounts and negative balances
    const currentLiabilities = (accounts || []).reduce((sum, acc) => {
      const bal = Number(acc?.balance) || 0;
      if (acc?.type === 'CREDIT_CARD') {
        return sum + (bal < 0 ? Math.abs(bal) : 0);
      }
      return sum + (bal < 0 ? Math.abs(bal) : 0);
    }, 0);

    const netWorthChartValues = Object.keys(pacingMap).map(key => {
      const val = Number(pacingMap[key]) || 0;
      return {
        name: key,
        Assets: Number((Math.max(val, 0)).toFixed(2)),
        Liabilities: Number(currentLiabilities.toFixed(2))
      };
    }).reverse();

    // 2. Cash Flow Chart (Income vs Expense by Month)
    const monthlyData = {};
    filteredTx.forEach(tx => {
      const monthName = new Date(tx.date).toLocaleDateString(undefined, { month: 'short' });
      if (!monthlyData[monthName]) {
        monthlyData[monthName] = { name: monthName, Income: 0, Expenses: 0 };
      }
      if (tx.type === 'INCOME') {
        monthlyData[monthName].Income += tx.convertedAmount || tx.amount;
      } else if (tx.type === 'EXPENSE') {
        monthlyData[monthName].Expenses += tx.convertedAmount || tx.amount;
      }
    });

    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sortedCashFlow = Object.values(monthlyData).sort((a, b) => {
      return monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name);
    });

    // 3. Category Donut Chart
    const categoriesMap = {};
    const categoriesEmojiMap = {};
    filteredTx.filter(tx => tx.type === currentTab).forEach(tx => {
      let catName = 'Other';
      let emoji = '🏷️';

      if (tx.type === 'TRANSFER') {
        catName = 'Transfer';
        emoji = '🔄';
      } else if (typeof tx.categoryId === 'object' && tx.categoryId?.name) {
        catName = tx.categoryId.name;
        emoji = tx.categoryId.emoji || '🏷️';
      } else {
        const catIdStr = typeof tx.categoryId === 'string' ? tx.categoryId : String(tx.categoryId?._id || tx.categoryId?.clientCatId || '');
        const matched = (categories || []).find(c => 
          String(c._id || '').toLowerCase() === catIdStr.toLowerCase() || 
          String(c.clientCatId || '').toLowerCase() === catIdStr.toLowerCase()
        );
        if (matched) {
          catName = matched.name;
          emoji = matched.emoji || '🏷️';
        } else if (tx.categoryName) {
          catName = tx.categoryName;
        }
      }

      const amt = Number(tx.convertedAmount || tx.amount) || 0;
      categoriesMap[catName] = (categoriesMap[catName] || 0) + amt;
      categoriesEmojiMap[catName] = emoji;
    });

    const categoryPieData = Object.keys(categoriesMap).map(key => ({
      name: key,
      value: Number(categoriesMap[key].toFixed(2)),
      emoji: categoriesEmojiMap[key] || '🏷️'
    })).sort((a, b) => b.value - a.value);

    return {
      netWorthData: netWorthChartValues.slice(-12),
      cashFlowData: sortedCashFlow,
      categoryData: categoryPieData,
      carryOverBalance
    };
  }, [accounts, transactions, categories, periodType, selectedDate, activeTab, user]);

  const formatPeriodLabel = () => {
    if (periodType === 'All') return 'All Time';
    if (periodType === 'Yearly') return selectedDate.getFullYear().toString();
    if (periodType === 'Monthly') {
      const monthlyStartDay = Math.min(31, Math.max(1, Number(user?.settings?.monthlyStartDate) || 1));
      if (monthlyStartDay === 1) {
        return selectedDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      }
      const currentDay = selectedDate.getDate();
      let startMonth = selectedDate.getMonth();
      let startYear = selectedDate.getFullYear();
      if (currentDay < monthlyStartDay) {
        startMonth -= 1;
        if (startMonth < 0) { startMonth = 11; startYear -= 1; }
      }
      const s = new Date(startYear, startMonth, monthlyStartDay);
      const e = new Date(startYear, startMonth + 1, monthlyStartDay - 1);
      return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}`;
    }
    if (periodType === 'Weekly') {
      const start = new Date(selectedDate);
      start.setDate(selectedDate.getDate() - selectedDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    return '';
  };

  const handlePrevPeriod = () => {
    const nextDate = new Date(selectedDate);
    if (periodType === 'Weekly') nextDate.setDate(selectedDate.getDate() - 7);
    else if (periodType === 'Monthly') nextDate.setMonth(selectedDate.getMonth() - 1);
    else if (periodType === 'Yearly') nextDate.setFullYear(selectedDate.getFullYear() - 1);
    setSelectedDate(nextDate);
  };

  const handleNextPeriod = () => {
    const nextDate = new Date(selectedDate);
    if (periodType === 'Weekly') nextDate.setDate(selectedDate.getDate() + 7);
    else if (periodType === 'Monthly') nextDate.setMonth(selectedDate.getMonth() + 1);
    else if (periodType === 'Yearly') nextDate.setFullYear(selectedDate.getFullYear() + 1);
    setSelectedDate(nextDate);
  };

  return {
    netWorthData,
    cashFlowData,
    categoryData,
    carryOverBalance,
    selectedDate,
    setSelectedDate,
    periodType,
    setPeriodType,
    activeTab,
    setActiveTab,
    selectedCategoryTransactions,
    setSelectedCategoryTransactions,
    formatPeriodLabel,
    handlePrevPeriod,
    handleNextPeriod
  };
}
