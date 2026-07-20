import { useState } from 'react';

export function useFormModal() {
  const [showKeypad, setShowKeypad] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectingAccountType, setSelectingAccountType] = useState('source'); // 'source' | 'destination'
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  const openKeypad = () => {
    setShowKeypad(true);
    setShowAccountSheet(false);
    setShowCategorySheet(false);
    setShowDatePicker(false);
  };

  const openAccountSheet = (type = 'source') => {
    setSelectingAccountType(type);
    setShowAccountSheet(true);
    setShowKeypad(false);
    setShowCategorySheet(false);
    setShowDatePicker(false);
  };

  const openCategorySheet = () => {
    setShowCategorySheet(true);
    setShowKeypad(false);
    setShowAccountSheet(false);
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
    setShowKeypad(false);
    setShowAccountSheet(false);
    setShowCategorySheet(false);
  };

  const closeAllSheets = () => {
    setShowKeypad(false);
    setShowAccountSheet(false);
    setShowCategorySheet(false);
    setShowDatePicker(false);
  };

  return {
    showKeypad,
    setShowKeypad,
    showAccountSheet,
    setShowAccountSheet,
    showCategorySheet,
    setShowCategorySheet,
    showDatePicker,
    setShowDatePicker,
    selectingAccountType,
    setSelectingAccountType,
    showAddCategoryModal,
    setShowAddCategoryModal,
    showAddAccountModal,
    setShowAddAccountModal,
    openKeypad,
    openAccountSheet,
    openCategorySheet,
    openDatePicker,
    closeAllSheets
  };
}
