# Project: Multi-Currency Account Transfer & Conversion Engine

## Architecture
The application is a full-stack expense and wealth management platform:
- **Backend**: Node.js (ES modules), Express 5.2.1, MongoDB with Mongoose 9.7.3, Vitest 5.0.2.
- **Frontend**: React 19, Vite 8, Tailwind CSS v4, DaisyUI v5, TanStack React Query v5, IndexedDB offline sync engine.

### Data Flow for Multi-Currency Transfers
1. **Initiation**: User opens transfer form in `FormModal.jsx`, selects source account (e.g. `MYR`) and destination account (e.g. `USD`).
2. **Detection & Preview**: UI detects `fromAccount.currency !== toAccount.currency`. It dynamically displays the Cross-Currency Conversion Card showing conversion direction (`MYR ➔ USD`), two-way editable exchange rate (`1 MYR = X USD`), and converted target amount (`Y USD`).
3. **Payload**: Form submits payload with `amount` (source currency), `currency` (source currency), `toAmount` (converted destination currency amount), `toCurrency` (destination currency), and `exchangeRate`.
4. **Backend Processing**: `transactionController.js` and `syncController.js`:
   - Deducts `amount` from source account.
   - Credits `toAmount` (or `amount * exchangeRate`) to destination account.
   - Handles reversal accurately upon transaction update or delete.
5. **Recalculation & Aggregation**: `syncExportImportController.js` aggregates `amount` for source debit and `$ifNull: ['$toAmount', '$convertedAmount', '$amount']` for destination credit.
6. **Display & History**: `AccountTransactionsModal.jsx` displays `+toCurrency toAmount` when viewing incoming transfers on destination accounts.

## Code Layout
- Backend Models: `backend/models/Transaction.js`, `backend/models/Account.js`
- Backend Controllers: `backend/controllers/transactionController.js`, `backend/controllers/syncController.js`, `backend/controllers/syncExportImportController.js`
- Backend Tests: `backend/tests/crossCurrencyTransfer.test.js`
- Frontend Components: `frontend/src/components/transactions/FormModal.jsx`, `frontend/src/components/AccountTransactionsModal.jsx`
- Frontend Hooks & Utilities: `frontend/src/hooks/useTransactionsForm.js`, `frontend/src/utils/syncManager.js`

## Feature Inventory
Every feature from the Survey phase must appear here with its assigned milestone. No feature may be left unassigned.
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Multi-Currency Transfer Schema Support | Add `toAmount`, `toCurrency` fields to `Transaction` schema to explicitly track destination currency and amount | M1 | Survey |
| 2 | Backend Directional Balance Effect | Update transfer logic in `transactionController.js` and `syncController.js` to debit source account by `amount` and credit destination account by `toAmount` | M1 | Survey |
| 3 | Backend Transfer Update & Delete Reversal | Correctly adjust source and destination account balances during transfer update and deletion | M1 | Survey |
| 4 | Data Recalculation Aggregation Integrity | Ensure `syncExportImportController.js` aggregation sums `amount` for source expenses and `toAmount` for destination transfers in | M1 | Survey |
| 5 | Currency Sync on Account Selection | Automatically synchronize transfer currency with selected source account in `FormModal.jsx` and `useTransactionsForm.js` | M1 | Survey |
| 6 | Cross-Currency Transfer UI Detection & Preview | Display dedicated conversion preview card whenever `sourceAccount.currency !== toAccount.currency`, regardless of user base currency | M1 | Survey |
| 7 | Two-Way Linked Rate & Target Amount Inputs | Allow entering either exchange rate or target amount, automatically recalculating the other | M1 | Survey |
| 8 | Offline Balance Cache Sync for Transfers | Update `syncManager.js` offline balance effect calculation to use `toAmount` for destination accounts | M1 | Survey |
| 9 | Account Transaction Modal Inflow Display | Display correct converted currency and amount (`+USD 11.20` instead of `+MYR 50.00`) in `AccountTransactionsModal.jsx` | M1 | Survey |
| 10 | Multi-Tier E2E & Backend Test Suite | Comprehensive Vitest suite covering Tiers 1-4 for cross-currency transfers, rates, balance updates, and edge cases | M1 | Survey |
| 11 | Adversarial Hardening & Verification | Hardening with boundary conditions, floating point rounding, and integrity audit | M1 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Full-Stack Multi-Currency Transfer & Test Suite | Backend models, controllers, recalculation, frontend form conversion card, account transaction modal, and Vitest test suite | none | DONE |

## Interface Contracts
### Frontend ➔ Backend Transfer Payload
- Endpoint: `POST /api/transactions` and `PUT /api/transactions/:id`
- Payload structure for Transfers:
  ```json
  {
    "accountId": "source_account_id",
    "toAccountId": "destination_account_id",
    "type": "TRANSFER",
    "amount": 50,
    "currency": "MYR",
    "toAmount": 11.20,
    "toCurrency": "USD",
    "exchangeRate": 0.224,
    "shouldConvert": true,
    "date": "2026-11-15T...",
    "notes": "..."
  }
  ```
- Balance Effects:
  - Source Account (`MYR`): `balance -= amount` (`-50.00 MYR`)
  - Destination Account (`USD`): `balance += toAmount` (`+11.20 USD`)
  - If same currency (`MYR` to `MYR`): `toAmount === amount`, `exchangeRate === 1.0`
