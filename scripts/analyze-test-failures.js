#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const logFile = process.argv[2] || 'test-output.log';

if (!fs.existsSync(logFile)) {
  console.error(`Test output file not found: ${logFile}`);
  process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf-8');
const lines = content.split('\n');

// Analysis results
const failureCategories = {
  'Mock Function Issues': [],
  'API Contract Mismatches': [],
  'Assertion Failures': [],
  'Import/Module Issues': [],
  'Type Errors': [],
  'Other': []
};

const failedTests = [];
const errorPatterns = [];

// Parse test output
let currentTest = null;
let currentError = [];
let inError = false;

lines.forEach((line, index) => {
  // Detect failed test
  if (line.includes('● ')) {
    if (currentTest && currentError.length > 0) {
      analyzeFailure(currentTest, currentError.join('\n'));
    }
    currentTest = line.replace('●', '').trim();
    currentError = [];
    inError = true;
  } else if (inError && line.trim() === '') {
    if (currentTest && currentError.length > 0) {
      analyzeFailure(currentTest, currentError.join('\n'));
    }
    currentTest = null;
    currentError = [];
    inError = false;
  } else if (inError) {
    currentError.push(line);
  }
});

// Handle last test if any
if (currentTest && currentError.length > 0) {
  analyzeFailure(currentTest, currentError.join('\n'));
}

function analyzeFailure(testName, errorMessage) {
  failedTests.push({ testName, errorMessage });
  
  // Categorize by error type
  if (errorMessage.includes('.mock') && errorMessage.includes('is not a function')) {
    failureCategories['Mock Function Issues'].push(testName);
  } else if (errorMessage.includes('Expected:') && errorMessage.includes('Received:')) {
    failureCategories['Assertion Failures'].push(testName);
  } else if (errorMessage.includes('Cannot find module') || errorMessage.includes('import')) {
    failureCategories['Import/Module Issues'].push(testName);
  } else if (errorMessage.includes('TypeError:')) {
    failureCategories['Type Errors'].push(testName);
  } else if (errorMessage.includes('expect(') && errorMessage.includes('toBe')) {
    failureCategories['API Contract Mismatches'].push(testName);
  } else {
    failureCategories['Other'].push(testName);
  }
  
  // Extract error patterns
  const typeErrorMatch = errorMessage.match(/TypeError: (.+)/);
  if (typeErrorMatch) {
    const pattern = typeErrorMatch[1];
    const existing = errorPatterns.find(p => p.pattern === pattern);
    if (existing) {
      existing.count++;
      existing.tests.push(testName);
    } else {
      errorPatterns.push({ pattern, count: 1, tests: [testName] });
    }
  }
}

// Generate report
console.log('# Test Failure Analysis Report\n');
console.log(`Total Failed Tests: ${failedTests.length}\n`);

console.log('## Failure Categories\n');
Object.entries(failureCategories).forEach(([category, tests]) => {
  if (tests.length > 0) {
    console.log(`### ${category} (${tests.length} tests)`);
    tests.slice(0, 5).forEach(test => {
      console.log(`- ${test}`);
    });
    if (tests.length > 5) {
      console.log(`... and ${tests.length - 5} more\n`);
    }
    console.log('');
  }
});

console.log('## Most Common Error Patterns\n');
errorPatterns
  .sort((a, b) => b.count - a.count)
  .slice(0, 10)
  .forEach(({ pattern, count, tests }) => {
    console.log(`### "${pattern}" (${count} occurrences)`);
    console.log('Affected tests:');
    tests.slice(0, 3).forEach(test => {
      console.log(`- ${test}`);
    });
    if (tests.length > 3) {
      console.log(`... and ${tests.length - 3} more`);
    }
    console.log('');
  });

// Generate statistics
const stats = {
  totalFailed: failedTests.length,
  mockingIssues: failureCategories['Mock Function Issues'].length,
  apiMismatches: failureCategories['API Contract Mismatches'].length,
  assertionFailures: failureCategories['Assertion Failures'].length,
  importIssues: failureCategories['Import/Module Issues'].length,
  typeErrors: failureCategories['Type Errors'].length,
  other: failureCategories['Other'].length
};

console.log('## Statistics\n');
console.log('```json');
console.log(JSON.stringify(stats, null, 2));
console.log('```\n');

// Recommendations
console.log('## Recommendations\n');
if (stats.mockingIssues > 10) {
  console.log('1. **ESM Mocking Issues**: The majority of failures are due to ESM module mocking.');
  console.log('   - Consider using `vi.mock()` if switching to Vitest');
  console.log('   - Or implement custom ESM mock loaders for Jest');
  console.log('   - Use dependency injection pattern to avoid mocking issues\n');
}

if (stats.apiMismatches > 5) {
  console.log('2. **API Contract Mismatches**: Many tests have outdated expectations.');
  console.log('   - Review actual implementation and update test expectations');
  console.log('   - Consider generating tests from implementation\n');
}

if (stats.assertionFailures > 5) {
  console.log('3. **Assertion Failures**: Tests are expecting different values than produced.');
  console.log('   - Update expected values to match current behavior');
  console.log('   - Verify if behavior changes were intentional\n');
}

// Save detailed report
const reportPath = 'test-failure-analysis.json';
fs.writeFileSync(reportPath, JSON.stringify({
  summary: stats,
  categories: failureCategories,
  patterns: errorPatterns,
  details: failedTests
}, null, 2));

console.log(`\nDetailed analysis saved to: ${reportPath}`);