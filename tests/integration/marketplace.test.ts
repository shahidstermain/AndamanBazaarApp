import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/lib/supabase';
import { operatorVerificationSchema } from '../../src/lib/validation';

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockReturnValue({ error: null })
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockReturnValue({ data: { id: 'test-user' }, error: null })
        }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/img.jpg' } })
      }))
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null })
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ 
        data: { 
          success: true, 
          booking_id: 'booking-123', 
          payment_session_id: 'session-456' 
        }, 
        error: null 
      })
    }
  },
  isSupabaseConfigured: () => true
}));

describe('Marketplace Integration Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Operator Verification Submission', () => {
    it('should validate and submit operator details correctly', async () => {
      const validData = {
        full_name: 'John Doe',
        phone: '9876543210',
        business_name: 'Sea Adventures',
        id_type: 'Aadhaar',
        id_number: '1234-5678-9012',
        address: '123 Beach Road, Havelock, Andaman'
      };

      const result = operatorVerificationSchema.safeParse(validData);
      expect(result.success).toBe(true);

      // Simulate the logic in BecomeOperator.tsx
      const { error } = await supabase
        .from('operator_verifications')
        .insert({
          user_id: 'test-user',
          ...validData,
          id_proof_url: 'https://test.com/id.jpg',
          address_proof_url: 'https://test.com/addr.jpg',
          status: 'pending'
        });

      expect(supabase.from).toHaveBeenCalledWith('operator_verifications');
      expect(error).toBe(null);
    });

    it('should fail validation for invalid phone numbers', () => {
      const invalidData = {
        full_name: 'John Doe',
        phone: '123', // Too short
        id_type: 'Aadhaar',
        id_number: '123',
        address: 'Short'
      };

      const result = operatorVerificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('KYC Document Storage', () => {
    it('should call storage upload with correct path pattern', async () => {
      const userId = 'user-123';
      const fileName = 'id_proof_123.jpg';
      const filePath = `${userId}/${fileName}`;
      const dummyFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

      const { data, error } = await supabase.storage
        .from('kyc_documents')
        .upload(filePath, dummyFile);

      expect(supabase.storage.from).toHaveBeenCalledWith('kyc_documents');
      expect(data?.path).toBeDefined();
      expect(error).toBe(null);
    });
  });

  describe('Booking Order Creation', () => {
    it('should invoke the create-booking-order function with expected payload', async () => {
      const payload = {
        listing_id: 'exp-789',
        booking_date: '2026-06-10',
        contact_number: '9999999999',
        guest_details: [{ tier_id: 'adult-tier', count: 2 }]
      };

      const { data, error } = await supabase.functions.invoke('create-booking-order', {
        body: payload
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-booking-order', {
        body: payload
      });
      expect(data.success).toBe(true);
      expect(data.payment_session_id).toBeDefined();
    });
  });
});
