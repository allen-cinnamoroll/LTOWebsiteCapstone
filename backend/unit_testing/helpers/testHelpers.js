// Test helper functions
import { jest } from '@jest/globals';

export const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  user: null,
  headers: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  socket: { remoteAddress: '127.0.0.1' },
  ...overrides,
});

export const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

export const createMockUser = (overrides = {}) => ({
  _id: 'user123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  middleName: null,
  role: '2',
  password: 'hashedpassword',
  comparePassword: jest.fn().mockResolvedValue(true),
  save: jest.fn().mockResolvedValue(true),
  toObject: jest.fn().mockReturnValue({
    _id: 'user123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  }),
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const createMockOwner = (overrides = {}) => ({
  _id: 'owner123',
  ownerRepresentativeName: 'John Doe',
  driversLicenseNumber: 'DL123456',
  emailAddress: 'owner@example.com',
  contactNumber: '1234567890',
  vehicleIds: [],
  save: jest.fn().mockResolvedValue(true),
  toObject: jest.fn().mockReturnValue({
    _id: 'owner123',
    ownerRepresentativeName: 'John Doe',
  }),
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const createMockVehicle = (overrides = {}) => ({
  _id: 'vehicle123',
  fileNo: 'FILE123',
  plateNo: 'ABC123',
  ownerId: 'owner123',
  status: 'Active',
  save: jest.fn().mockResolvedValue(true),
  toObject: jest.fn().mockReturnValue({
    _id: 'vehicle123',
    fileNo: 'FILE123',
    plateNo: 'ABC123',
  }),
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const createMockViolation = (overrides = {}) => ({
  _id: 'violation123',
  topNo: 'TOP-123456',
  firstName: 'John',
  lastName: 'Doe',
  violations: ['Speeding'],
  violationType: 'confiscated',
  save: jest.fn().mockResolvedValue(true),
  toObject: jest.fn().mockReturnValue({
    _id: 'violation123',
    topNo: 'TOP-123456',
  }),
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const createMockAccident = (overrides = {}) => ({
  _id: 'accident123',
  blotterNo: 'BLT-123456',
  vehiclePlateNo: 'ABC123',
  municipality: 'Test Municipality',
  save: jest.fn().mockResolvedValue(true),
  toObject: jest.fn().mockReturnValue({
    _id: 'accident123',
    blotterNo: 'BLT-123456',
  }),
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockResolvedValue(true),
  ...overrides,
});

