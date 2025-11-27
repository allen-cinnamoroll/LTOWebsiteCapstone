// Test setup helper for ES modules
// This manually creates mocks that can be used across all test files

export const createMockModels = () => {
  const mockModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  return {
    UserModel: { ...mockModel },
    OwnerModel: { ...mockModel },
    VehicleModel: { ...mockModel },
    ViolationModel: { ...mockModel },
    AccidentModel: { ...mockModel },
    UserLogModel: { ...mockModel },
  };
};

export const createMockUtils = () => ({
  userLogger: {
    logUserActivity: jest.fn().mockResolvedValue(undefined),
    getClientIP: jest.fn().mockReturnValue('127.0.0.1'),
    getUserAgent: jest.fn().mockReturnValue('test-agent'),
  },
  emailService: {
    sendOTPEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetOTP: jest.fn().mockResolvedValue(true),
  },
  jwt: {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  },
  plateStatusCalculator: {
    getVehicleStatus: jest.fn().mockReturnValue('Active'),
    calculateExpirationDate: jest.fn(),
  },
});

