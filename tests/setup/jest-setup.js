// Jest setup file for ESM mocking support
import { jest } from '@jest/globals';

// Store original modules for restoration
const originalModules = new Map();

// Custom mock factory for ESM modules
global.createMockFromModule = (modulePath) => {
  const module = jest.createMockFromModule(modulePath);
  return module;
};

// Helper to mock ESM modules
global.mockESMModule = (modulePath, mockImplementation) => {
  // Store original if not already stored
  if (!originalModules.has(modulePath)) {
    originalModules.set(modulePath, jest.requireActual(modulePath));
  }
  
  // Apply mock
  jest.unstable_mockModule(modulePath, () => mockImplementation);
};

// Helper to restore mocked modules
global.restoreESMModule = (modulePath) => {
  const original = originalModules.get(modulePath);
  if (original) {
    jest.unstable_mockModule(modulePath, () => original);
  }
};

// Global test lifecycle hooks
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});