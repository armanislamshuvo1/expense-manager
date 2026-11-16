/**
 * Test Framework Helper for E2E Suite
 * Provides clean describe/it/expect and suite registry for reproducible CLI runs.
 */

let currentSuite = null;
const allSuites = [];

export function describe(name, fn) {
  const suite = {
    name,
    parent: currentSuite,
    tests: [],
    beforeEachHooks: []
  };
  allSuites.push(suite);
  const prevSuite = currentSuite;
  currentSuite = suite;
  try {
    fn();
  } finally {
    currentSuite = prevSuite;
  }
}

export function beforeEach(fn) {
  if (currentSuite) {
    currentSuite.beforeEachHooks.push(fn);
  }
}

export function it(name, fn) {
  if (!currentSuite) {
    describe('Default Suite', () => {
      it(name, fn);
    });
    return;
  }
  currentSuite.tests.push({ name, fn });
}

export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new Error(`Expected ${actualStr} to equal ${expectedStr}`);
      }
    },
    toBeCloseTo(expected, numDigits = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -numDigits) / 2;
      if (diff > tolerance) {
        throw new Error(`Expected ${actual} to be close to ${expected} (diff: ${diff}, tolerance: ${tolerance})`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined, but was undefined`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected value to be null, but was ${actual}`);
      }
    },
    toThrow(regexOrMsg) {
      if (typeof actual !== 'function') {
        throw new Error(`Expected function to test for throwing, but got ${typeof actual}`);
      }
      let threw = false;
      let thrownError = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        thrownError = err;
      }
      if (!threw) {
        throw new Error(`Expected function to throw, but it executed without error`);
      }
      if (regexOrMsg) {
        const message = thrownError?.message || String(thrownError);
        if (regexOrMsg instanceof RegExp) {
          if (!regexOrMsg.test(message)) {
            throw new Error(`Expected error message "${message}" to match ${regexOrMsg}`);
          }
        } else if (typeof regexOrMsg === 'string') {
          if (!message.includes(regexOrMsg)) {
            throw new Error(`Expected error message "${message}" to include "${regexOrMsg}"`);
          }
        }
      }
    }
  };
}

export async function runSuites() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    suites: []
  };

  for (const suite of allSuites) {
    const suiteResult = {
      name: suite.name,
      tests: [],
      passed: true
    };

    const getHooks = (s) => {
      const hooks = [];
      let curr = s;
      while (curr) {
        hooks.unshift(...curr.beforeEachHooks);
        curr = curr.parent;
      }
      return hooks;
    };
    const allHooks = getHooks(suite);

    for (const test of suite.tests) {
      results.total++;
      let error = null;
      const start = Date.now();
      try {
        for (const hook of allHooks) {
          await hook();
        }
        await test.fn();
      } catch (err) {
        error = err;
      }
      const duration = Date.now() - start;

      if (error) {
        results.failed++;
        suiteResult.passed = false;
        suiteResult.tests.push({ name: test.name, status: 'FAILED', duration, error });
      } else {
        results.passed++;
        suiteResult.tests.push({ name: test.name, status: 'PASSED', duration });
      }
    }

    results.suites.push(suiteResult);
  }

  return results;
}

export function clearSuites() {
  allSuites.length = 0;
  currentSuite = null;
}
