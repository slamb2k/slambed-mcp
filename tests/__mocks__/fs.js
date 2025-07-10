import { jest } from '@jest/globals';

export const readFileSync = jest.fn();
export const writeFileSync = jest.fn();
export const existsSync = jest.fn();
export const mkdirSync = jest.fn();
export const readdirSync = jest.fn();
export const statSync = jest.fn();
export const unlinkSync = jest.fn();

export const promises = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn()
};

export default {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  promises
};