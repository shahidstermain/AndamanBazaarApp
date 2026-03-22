
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  const kycBucket = buckets.find(b => b.name === 'kyc_documents');
  if (!kycBucket) {
    console.log('Creating kyc_documents bucket...');
    const { data, error } = await supabase.storage.createBucket('kyc_documents', {
      public: false, // Private by default
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      fileSizeLimit: 5242880 // 5MB
    });
    if (error) {
      console.error('Error creating bucket:', error);
    } else {
      console.log('Bucket created successfully');
    }
  } else {
    console.log('kyc_documents bucket already exists');
  }
}

setupStorage();
