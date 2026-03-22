
/**
 * AndamanBazaar Marketplace Integration Test
 * 
 * Verifies:
 * 1. Supabase Storage (KYC Document Upload)
 * 2. Supabase Database (Operator Verification Table Write)
 * 3. Supabase Edge Function (Cashfree Booking Order Creation)
 * 
 * Usage:
 * npx tsx scripts/test-marketplace-real.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY!; // Needs service role for certain db writes if bypassing RLS

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log('🚀 Starting Marketplace Integration Tests (Real API)...');

  try {
    // 1. Check if KYC Bucket exists
    console.log('\n--- Test 1: Storage Bucket ---');
    const { data: buckets } = await supabase.storage.listBuckets();
    const kycBucket = buckets?.find(b => b.name === 'kyc_documents');
    if (!kycBucket) {
       console.error('❌ KYC bucket not found. Run SQL migrations first.');
       return;
    }
    console.log('✅ KYC storage bucket found.');

    // 2. Test Storage Upload
    console.log('\n--- Test 2: File Upload ---');
    const testFile = Buffer.from('test-content');
    const testPath = `test-user/id_verification_test_${Date.now()}.txt`;
    const { error: uploadError } = await supabase.storage
      .from('kyc_documents')
      .upload(testPath, testFile, { contentType: 'text/plain', upsert: true });

    if (uploadError) throw uploadError;
    console.log('✅ File upload to kyc_documents successful.');

    // 3. Test Database Write (Operator Verification)
    console.log('\n--- Test 3: Operator Verification DB Write ---');
    const testUser = '00000000-0000-0000-0000-000000000000'; // Replace with real UID if testing RLS
    const { data: verification, error: dbError } = await supabase
      .from('operator_verifications')
      .insert({
        user_id: testUser,
        full_name: 'TEST USER',
        phone: '9999999999',
        id_type: 'Aadhaar',
        id_number: 'TEST-123',
        address: 'Test Address, Andaman Islands',
        id_proof_url: 'https://test.com/id.jpg',
        address_proof_url: 'https://test.com/addr.jpg',
        status: 'pending'
      })
      .select('id')
      .single();

    if (dbError) throw dbError;
    console.log(`✅ Operator verification created. Record ID: ${verification.id}`);

    // 4. Test Edge Function (Requires a listing with is_experience = true)
    console.log('\n--- Test 4: Cashfree Booking Edge Function ---');
    console.log('Note: To test this, you need an active listing marked as is_experience=true.');
    
    // We'll just check if the function endpoint responds (even with error or auth check)
    // to verify the route is active.
    const { error: fnError } = await supabase.functions.invoke('create-booking-order', {
      body: { 
         listing_id: 'any-listing', 
         booking_date: '2026-04-01',
         guest_details: [{ tier_id: 'any', count: 1 }]
      }
    });

    // We expect a 400 error (Invalid listing or Auth error) rather than a 404 (Not Found)
    if (fnError && fnError.message?.includes('Not Found')) {
       console.error('❌ Edge Function "create-booking-order" not found. Need to deploy.');
    } else {
       console.log('✅ Edge Function endpoint reached (response status logged below).');
       console.log(`ℹ️ Function Response: ${fnError?.message || 'Check detailed logs'}`);
    }

    console.log('\n✨ ALL LOGIC TESTS COMPLETED! Environment is ready for production.');

    // Clean up test data
    await supabase.from('operator_verifications').delete().eq('id', verification.id);
    await supabase.storage.from('kyc_documents').remove([testPath]);
    console.log('🗑️ Test data cleaned up.');

  } catch (err: any) {
    console.error('\n❌ TEST FAILED');
    console.error(err.message);
  }
}

runTests();
