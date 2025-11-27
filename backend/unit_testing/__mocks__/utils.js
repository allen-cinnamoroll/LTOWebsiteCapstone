// Mock utility functions

export const mockLogUserActivity = jest.fn().mockResolvedValue(undefined);
export const mockGetClientIP = jest.fn().mockReturnValue('127.0.0.1');
export const mockGetUserAgent = jest.fn().mockReturnValue('test-agent');
export const mockSendOTPEmail = jest.fn().mockResolvedValue(true);
export const mockSendPasswordResetOTP = jest.fn().mockResolvedValue(true);
export const mockGetVehicleStatus = jest.fn().mockReturnValue('Active');
export const mockCalculateExpirationDate = jest.fn();
export const mockGetLatestRenewalDate = jest.fn();

