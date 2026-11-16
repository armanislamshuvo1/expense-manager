#!/usr/bin/env node

/**
 * E2E Test Runner for Expense Manager (Multi-Currency Transfer Track)
 * 
 * Executes all 4 tiers of tests:
 * - Tier 1: Feature Coverage
 * - Tier 2: Boundary & Corner Cases
 * - Tier 3: Cross-Feature Combinations
 * - Tier 4: Real-World Application Scenarios
 * 
 * Exit code 0 on complete pass, 1 on any failure.
 */

import { runSuites } from './harness/testHelper.js';

// Import all test suites to register test definitions
await import('./suites/tier1_feature_coverage.test.js');
await import('./suites/tier2_boundary_corner.test.js');
await import('./suites/tier3_cross_feature.test.js');
await import('./suites/tier4_real_world.test.js');

async function main() {
  const startTime = Date.now();
  console.log('='.repeat(75));
  console.log('  EXPENSE MANAGER E2E TEST SUITE — MULTI-CURRENCY TRANSFER TRACK');
  console.log('='.repeat(75));

  const results = await runSuites();
  const totalDuration = Date.now() - startTime;

  console.log('\n--- SUITE EXECUTION SUMMARY ---');

  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;
  let tier4Count = 0;

  for (const suite of results.suites) {
    const isTier1 = suite.name.includes('Feature 1:') || suite.name.includes('Feature 2:') ||
                    suite.name.includes('Feature 3:') || suite.name.includes('Feature 4:') ||
                    suite.name.includes('Feature 5:') || suite.name.includes('Feature 6:') ||
                    suite.name.includes('Feature 7:') || suite.name.includes('Feature 8:') ||
                    suite.name.includes('Feature 9:') || suite.name.includes('Tier 1:');

    const isTier2 = suite.name.includes('Boundary 1:') || suite.name.includes('Boundary 2:') ||
                    suite.name.includes('Boundary 3:') || suite.name.includes('Boundary 4:') ||
                    suite.name.includes('Boundary 5:') || suite.name.includes('Tier 2:');

    const isTier3 = suite.name.includes('Pairwise 1:') || suite.name.includes('Pairwise 2:') ||
                    suite.name.includes('Pairwise 3:') || suite.name.includes('Pairwise 4:') ||
                    suite.name.includes('Pairwise 5:') || suite.name.includes('Tier 3:');

    const isTier4 = suite.name.includes('Scenario 1:') || suite.name.includes('Scenario 2:') ||
                    suite.name.includes('Scenario 3:') || suite.name.includes('Scenario 4:') ||
                    suite.name.includes('Scenario 5:') || suite.name.includes('Tier 4:');

    const testCount = suite.tests.length;
    if (isTier1) tier1Count += testCount;
    else if (isTier2) tier2Count += testCount;
    else if (isTier3) tier3Count += testCount;
    else if (isTier4) tier4Count += testCount;

    if (testCount > 0) {
      const statusSymbol = suite.passed ? '✓' : '✗';
      console.log(` ${statusSymbol} ${suite.name} (${testCount} tests)`);
      for (const t of suite.tests) {
        if (t.status === 'FAILED') {
          console.error(`    FAILED: ${t.name}`);
          console.error(`      ${t.error?.message || t.error}`);
        }
      }
    }
  }

  console.log('\n' + '-'.repeat(75));
  console.log('TIER BREAKDOWN:');
  console.log(`  Tier 1 (Feature Coverage):           ${tier1Count} tests`);
  console.log(`  Tier 2 (Boundary & Corner Cases):    ${tier2Count} tests`);
  console.log(`  Tier 3 (Cross-Feature Combinations): ${tier3Count} tests`);
  console.log(`  Tier 4 (Real-World Scenarios):       ${tier4Count} tests`);
  console.log('-'.repeat(75));
  console.log(`TOTAL TESTS: ${results.total} | PASSED: ${results.passed} | FAILED: ${results.failed}`);
  console.log(`EXECUTION TIME: ${totalDuration}ms`);
  console.log('='.repeat(75));

  if (results.failed > 0) {
    console.error(`\n❌ TEST SUITE FAILED with ${results.failed} failing assertion(s).\n`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL E2E TEST SUITES PASSED SUCCESSFULLY.\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error during test runner execution:', err);
  process.exit(1);
});
