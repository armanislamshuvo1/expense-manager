import React, { createContext, useContext, useState, useCallback } from 'react';
import AccountTransactionsModal from '../components/AccountTransactionsModal';

const AccountModalContext = createContext();

export const AccountModalProvider = ({ children }) => {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const isOpen = !!selectedAccount;

  const openAccountModal = useCallback((accountOrId) => {
    // If a raw id string is passed, we will resolve later in modal using accounts data.
    setSelectedAccount(typeof accountOrId === 'string' ? { _id: accountOrId } : accountOrId);
  }, []);

  const closeAccountModal = useCallback(() => {
    setSelectedAccount(null);
  }, []);

  return (
    <AccountModalContext.Provider value={{ selectedAccount, isOpen, openAccountModal, closeAccountModal }}>
      {children}
      <AccountTransactionsModal />
    </AccountModalContext.Provider>
  );
};

export const useAccountModal = () => useContext(AccountModalContext);
