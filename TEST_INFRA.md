# E2E Test Infra: Recurring Transactions (Cron) Feature

## Test Philosophy
- Hermetic, deterministic testing without external cloud dependencies.
- Multi-tier validation: Schema invariant tests, 1-cron-per-user isolation, mathematical schedule rollover, idempotency, atomic balance effects, and auth security.
- Verification commands:
  - `cd backend && npm test` (Vitest)
  - `cd frontend && npm run lint` (Oxlint)
  - `cd frontend && npm run build` (Vite production build)

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | RecurringTransaction Schema | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 2 | UserCronManager (1-cron-per-user) | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 3 | Schedule Rollover (Daily/Weekly/Monthly) | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 4 | Execution & Atomic Balance Update | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 5 | Authorization & Cross-User Isolation | ORIGINAL_REQUEST | 5 | 5 | ✓ |
| 6 | Version Bump Synchronization | AGENTS.md | 4 | 2 | ✓ |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: Happy path creation, listing, updating, toggling, and manual run for recurring transactions.
- **Tier 2 (Boundary & Corner Cases)**: 0 active rules -> 0 cron jobs in RAM; 10 rules for same user -> exactly 1 cron job; pause all rules -> 0 cron jobs; resume rule -> 1 cron job re-created; deleted user -> cron stopped; leap years / month-end rollovers (Jan 31 -> Feb 28); invalid frequencies.
- **Tier 3 (Cross-Feature & Isolation)**: User A cannot see, edit, delete, or trigger User B's recurring rules. Atomic balance updates for INCOME ($inc), EXPENSE ($inc -amount), TRANSFER ($inc source -amount, target +toAmount).
- **Tier 4 (Real-World Application Scenarios)**: User with daily coffee expense and monthly rent transfer, runs automated execution, verifies generated transactions reflect `isRecurringInstance: true` and account balances match expectation.
