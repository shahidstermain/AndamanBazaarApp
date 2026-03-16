import { verifyLocation } from '../src/lib/functions';

describe('verifyLocation', () => {
  it('should return success and verified true for valid coordinates', async () => {
    const mockRequest = {
      latitude: 11.6234,
      longitude: 92.7325,
      accuracy: 50,
      timestamp: Date.now(),
    };

    const mockResponse = {
      success: true,
      verified: true,
      distance: 10,
      city: 'Port Blair',
      accuracy: 50,
      ipMatchesAndaman: true,
    };

      ok: true,
      json: async () => mockResponse,
    });

    const response = await verifyLocation(mockRequest);
    expect(response.success).toBe(true);
    expect(response.verified).toBe(true);
    expect(response.city).toBe('Port Blair');
  });

  it('should return success false for invalid coordinates', async () => {
    const mockRequest = {
      latitude: 0,
      longitude: 0,
      accuracy: 500,
      timestamp: Date.now(),
    };

    const mockResponse = {
      success: false,
      verified: false,
      error: 'Location verification failed',
    };

      ok: false,
      statusText: 'Bad Request',
    });

    const response = await verifyLocation(mockRequest);
    expect(response.success).toBe(false);
    expect(response.verified).toBe(false);
  });
});
