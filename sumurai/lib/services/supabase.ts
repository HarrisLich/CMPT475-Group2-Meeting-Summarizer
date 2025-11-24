import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const signUp = async (email: string, password: string) => {
  return supabase.auth.signUp({
    email,
    password,
  });
};

export const signIn = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  return supabase.auth.getUser();
};

export type ProfileData = {
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    role?: string;
    job_title?: string;
    company?: string;
    bio?: string;
    location?: string;
    membership_type?: string;
    updated_at?: string;
    created_at?: string;
  };
  
export const getCurrentProfile = async () => {
  try {
    console.log("Supabase service: getCurrentProfile called");
    
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      console.error("Supabase service: User not authenticated");
      return { data: null, error: new Error('Not authenticated') };
    }

    console.log("Supabase service: Getting profile for user ID:", user.user.id);

    const result = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.user.id)
      .single();

    console.log("Supabase service: getCurrentProfile result:", result);
    return result;
    
  } catch (error) {
    console.error("Supabase service: getCurrentProfile error:", error);
    return { data: null, error };
  }
};
  
export const updateProfile = async (updates: ProfileData) => {
  try {
    console.log("Supabase service: updateProfile called with:", updates);
    
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      console.error("Supabase service: User not authenticated");
      return { data: null, error: new Error('Not authenticated') };
    }

    console.log("Supabase service: Authenticated user ID:", user.user.id);

    // Add updated_at timestamp
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    console.log("Supabase service: Updating with data:", updatedData);

    const result = await supabase
      .from('profiles')
      .update(updatedData)
      .eq('id', user.user.id)
      .select(); // Add select to return the updated data

    console.log("Supabase service: Update result:", result);
    return result;
    
  } catch (error) {
    console.error("Supabase service: updateProfile error:", error);
    return { data: null, error };
  }
};

export const uploadAvatar = async (file: File) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { data: null, error: new Error('Not authenticated') };
  
  // Always use .png for cropped images
  const fileName = `${user.user.id}-${Math.random().toString(36).substring(2)}.png`;
  
  console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/png'
    });
    
  if (error) {
    console.error('Storage upload error:', error);
    if (error.message?.includes('Bucket not found')) {
      return { data: null, error: new Error('Storage bucket not found. Please contact support.') };
    }
    if (error.message?.includes('new row violates row-level security')) {
      return { data: null, error: new Error('Permission denied. Please check your storage policies.') };
    }
    if (error.message?.includes('duplicate')) {
      // If file exists, try with new name
      const retryFileName = `${user.user.id}-${Math.random().toString(36).substring(2)}.png`;
      const retryData = await supabase.storage
        .from('avatars')
        .upload(retryFileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/png'
        });
      if (retryData.error) {
        return { data: null, error: retryData.error };
      }
      const filePath = retryData.data?.path || retryFileName;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      await updateProfile({ avatar_url: publicUrl });
      return { data: publicUrl, error: null };
    }
    return { data: null, error };
  }
  
  // Get the file path from the upload response
  const filePath = data?.path || fileName;
  console.log('File uploaded successfully to path:', filePath);
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);
  
  const publicUrl = urlData.publicUrl;
  console.log('Generated public URL:', publicUrl);
  
  // Verify file exists in storage
  try {
    const { data: fileData, error: fileError } = await supabase.storage
      .from('avatars')
      .list(filePath.split('/').slice(0, -1).join('/') || '', {
        search: filePath.split('/').pop()
      });
    
    if (fileError) {
      console.warn('File verification error:', fileError);
    } else {
      console.log('File verified in storage:', fileData);
    }
    
    // Also test URL accessibility
    const testResponse = await fetch(publicUrl, { method: 'HEAD' });
    console.log('URL accessibility test - Status:', testResponse.status, 'OK:', testResponse.ok);
    if (!testResponse.ok && testResponse.status !== 405) { // 405 is Method Not Allowed, but file might still exist
      console.error('URL test failed - file may not be accessible:', testResponse.status);
    }
  } catch (testError) {
    console.warn('File verification error (continuing anyway):', testError);
  }
    
  // Update profile with new avatar URL
  console.log('Updating profile with avatar_url:', publicUrl);
  const updateResult = await updateProfile({ avatar_url: publicUrl });
  
  if (updateResult.error) {
    console.error('Profile update error:', updateResult.error);
    return { data: null, error: updateResult.error };
  }
  
  console.log('Profile updated successfully');
  return { data: publicUrl, error: null };
};