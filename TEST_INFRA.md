# E2E Test Infra: Multi-Currency Account Transfer & Conversion

## Test Philosophy
- Opaque-box, requirement-driven verification of multi-currency transfer mechanics and balance integrity.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial Testing + Workload Testing.

## Test Architecture
- Test Framework: Vitest (`backend/node_modules/.bin/vitest`)
- Test Command: `npm test` inside `backend/` or `npm test -- tests/crossCurrencyTransfer.test.js`
- Test Location: `backend/tests/crossCurrencyTransfer.test.js`
- Pass/Fail Semantics: Exit code 0, all assertions pass, no balance drift.

## Test Tiers & Scenarios

### Tier 1 - Feature Coverage (>= 5 cases per feature)
1. Same-currency transfer (MYR to MYR) maintains 1:1 balance adjustment (`-50 MYR`, `+50 MYR`).
2. Cross-currency transfer with standard rate (MYR to USD at 0.224): `-50 MYR`, `+11.20 USD`.
3. Cross-currency transfer with inverse rate (USD to MYR at 4.46): `-10 USD`, `+44.60 MYR`.
4. Cross-currency transfer with custom manual target amount: user enters 50 MYR and specifies target 12.00 USD.
5. Cross-currency transfer between two non-base currencies (EUR to JPY in an MYR base account).

### Tier 2 - Boundary & Corner Cases (>= 5 cases)
1. High-precision decimal transfer amounts (e.g., 0.01 MYR at 0.224 rate -> 0.00224 rounded to 0.00 or 0.01).
2. Large amount transfer (e.g., 1,000,000 MYR to USD).
3. Fractional exchange rates (e.g. 1 JPY = 0.0067 USD).
4. Equal exchange rate cross-currency (e.g. EUR to USD at 1.0000).
5. Zero or negative amount validation rejection.

### Tier 3 - Cross-Feature Combinations
1. Transfer followed by transaction update (modifying amount or exchange rate updates both account balances accurately).
2. Transfer followed by deletion (both source and destination accounts are reverted to their exact pre-transfer balances).
3. Transfer followed by sync / bulk recalculation (`syncExportImportController.js` recalculates balances matching incremental updates).
4. Multiple sequential cross-currency transfers between 3 accounts (MYR -> USD -> SGD -> MYR) maintaining net integrity.

### Tier 4 - Real-World Application Scenarios
1. User with Base MYR travels to USA: Transfers 500 MYR to USD travel card at rate 0.22 (getting 110 USD). Later transfers remaining 20 USD back to MYR at rate 4.45 (getting 89 MYR). Both balances reconcile.
2. Freelancer receiving 1000 USD: Transfers 1000 USD to local MYR account at bank rate 4.42 (receiving 4420 MYR). Logs subsequent local expenses. All financial reports and account totals balance.

### Coverage Thresholds
- Tier 1: ≥5 test cases
- Tier 2: ≥5 test cases
- Tier 3: ≥4 test cases
- Tier 4: ≥2 test cases
- Total Minimum: ≥16 automated test cases in test suite
