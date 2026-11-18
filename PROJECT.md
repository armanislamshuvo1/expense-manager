# Project: Expense Manager (NexusWealth) - User-Level Recurring Transactions (Cron)

## Architecture
- **Backend**: Express 5 (ESM) + Mongoose 9. Singleton `UserCronManager` service (`node-cron`) maintains strictly at most 1 cron runner per active user (`Map<userId, cronTask>`). MongoDB collection `RecurringTransaction` stores recurrence schedules.
- **Data Flow**:
  1. User configures repeated transaction in UI (`FormModal.jsx` or `/settings/recurring`).
  2. Backend validates payload, verifies ownership of accounts/category, and stores `RecurringTransaction`.
  3. `UserCronManager.syncUserCron(userId)` ensures strictly at most 1 cron runner exists in memory for this user if active rules > 0 (or stops/removes if 0).
  4. When the user cron triggers (or via "Run Now"), `processUserRecurringTransactions(userId)` atomically advances `nextRunDate`, creates `Transaction` records with `isRecurringInstance: true`, updates `Account.balance` via `$inc`, and clears `InsightCache`.
  5. UI displays recurring transaction badges in `List.jsx` and provides schedule management in `/settings/recurring`.
- **Version Synchronization**: 4 files bumped from `3.0.6` to `3.1.0` in tandem per `AGENTS.md`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | RecurringTransaction Model | Mongoose schema for recurring rules (frequency: DAILY, WEEKLY, MONTHLY, status, nextRunDate, amount, account, category, type) | M1 | survey |
| 2 | UserCronManager Singleton | Background scheduler ensuring strictly 1 cron runner in memory per user (`Map<userId, cronTask>`) | M1 | survey |
| 3 | Recurring API Endpoints | REST endpoints (`POST /api/recurring`, `GET /api/recurring`, `PUT /api/recurring/:id`, `PATCH /api/recurring/:id/toggle`, `DELETE /api/recurring/:id`, `POST /api/recurring/run-now`) | M1 | survey |
| 4 | Data Wipe & Cleanup Hook | Ensure user data wipe (`userDataManagementController.js`) removes recurring transactions and stops user cron | M1 | survey |
| 5 | Recurring Transaction UI in FormModal | Recurrence toggle and frequency picker in `FormModal.jsx`, pre-populated from `user.settings.repeatDefault` | M1 | survey |
| 6 | Recurring Management Screen | Screen at `/settings/recurring` (`RecurringTransactionsSetting.jsx`) to view, pause/resume, edit, delete, and manually trigger rules | M1 | survey |
| 7 | Recurring Badge in Transaction List | Visual indicator badge (`<Repeat />`) on recurring instances in `List.jsx` | M1 | survey |
| 8 | Vitest Backend Test Suite | Comprehensive unit/integration tests in `backend/tests/recurringTransaction.test.js` (40 tests) validating 1-cron-per-user invariant, idempotency, and auth isolation | M1 | survey |
| 9 | Version Bump Synchronization | Bump version to `3.1.0` across `frontend/package.json`, `frontend/src/utils/appUpdateManager.js`, `backend/controllers/appVersionController.js`, and `RELEASE_NOTES.md` | M1 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Recurring Transactions & User Cron System | Complete backend and frontend implementation, tests, and version bump synchronization | none | DONE |

## Interface Contracts
### Client ↔ Server REST API (`/api/recurring`)
- `POST /api/recurring`: Body: `{ type: 'INCOME'|'EXPENSE'|'TRANSFER', amount: Number, currency: String, accountId: ObjectId, toAccountId?: ObjectId, categoryId?: ObjectId, frequency: 'DAILY'|'WEEKLY'|'MONTHLY', startDate?: Date, note?: String, description?: String }`. Response: `{ success: true, data: RecurringTransaction }`
- `GET /api/recurring`: Query: `{ status?: 'ACTIVE'|'PAUSED' }`. Response: `{ success: true, data: [RecurringTransaction] }`
- `GET /api/recurring/:id`: Response: `{ success: true, data: RecurringTransaction }`
- `PUT /api/recurring/:id`: Body: Partial updates. Response: `{ success: true, data: RecurringTransaction }`
- `PATCH /api/recurring/:id/toggle`: Response: `{ success: true, data: { _id, status } }`
- `DELETE /api/recurring/:id`: Response: `{ success: true, message: 'Recurring transaction deleted' }`
- `POST /api/recurring/run-now`: Manually trigger overdue/pending runs for the user. Response: `{ success: true, executedCount: Number, transactions: [Transaction] }`

### UserCronManager Interface
- `syncUserCron(userId)`: Ensures `userCrons.has(userId)` if active rules > 0, else stops and deletes task.
- `hasUserCron(userId)`: Returns boolean indicating if user has a cron task in RAM.
- `getUserCronCount(userId)`: Returns number of active crons for user (strictly 0 or 1).
- `processUserRecurringTransactions(userId)`: Atomic execution of overdue rules.
- `initAllActiveUserCrons()`: Re-hydrates 1 cron per active user on server boot.

## Code Layout
### Backend
- `backend/models/RecurringTransaction.js`: Mongoose schema and indexes
- `backend/models/Transaction.js`: Add `recurringTransactionId`, `isRecurringInstance`
- `backend/services/userCronManager.js`: Singleton cron manager enforcing 1-cron-per-user
- `backend/controllers/recurringTransactionController.js`: CRUD and run-now handlers
- `backend/routes/recurringRoutes.js`: Express routes with `protectRoute`
- `backend/routes/index.js`: Mount `/recurring` and `/recurring-transactions`
- `backend/index.js`: Initialize user crons on startup
- `backend/controllers/userDataManagementController.js`: Clean up recurring rules and stop cron
- `backend/controllers/appVersionController.js`: Bump version to 3.1.0
- `backend/package.json`: Add `node-cron` dependency
- `backend/tests/recurringTransaction.test.js`: Vitest test suite (40 tests)

### Frontend
- `frontend/src/services/recurringService.js`: API methods for recurring endpoints
- `frontend/src/components/transactions/FormModal.jsx`: Recurrence toggle and frequency selector
- `frontend/src/hooks/useTransactionsForm.js`: Recurring state handling
- `frontend/src/pages/RecurringTransactionsSetting.jsx`: Management page
- `frontend/src/components/more/SettingsSection.jsx`: Link to recurring transactions page
- `frontend/src/components/transactions/List.jsx`: Recurring badge indicator
- `frontend/src/App.jsx`: Route for `/settings/recurring`
- `frontend/package.json`: Bump version to 3.1.0
- `frontend/src/utils/appUpdateManager.js`: Update `CURRENT_APP_VERSION` to 3.1.0
- `RELEASE_NOTES.md`: Add `## [v3.1.0]` release notes
