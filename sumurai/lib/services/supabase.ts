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
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const result = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.user.id)
      .single();

    return result;

  } catch (error) {
    console.error("Error fetching profile:", error);
    return { data: null, error };
  }
};
  
export const updateProfile = async (updates: ProfileData) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // Add updated_at timestamp
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const result = await supabase
      .from('profiles')
      .update(updatedData)
      .eq('id', user.user.id)
      .select();

    return result;

  } catch (error) {
    console.error("Error updating profile:", error);
    return { data: null, error };
  }
};

export const uploadAvatar = async (file: File) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { data: null, error: new Error('Not authenticated') };

  // Always use .png for cropped images
  const fileName = `${user.user.id}-${Math.random().toString(36).substring(2)}.png`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/png'
    });

  if (error) {
    console.error('Avatar upload error:', error);
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

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  // Update profile with new avatar URL
  const updateResult = await updateProfile({ avatar_url: publicUrl });

  if (updateResult.error) {
    console.error('Error updating profile with avatar:', updateResult.error);
    return { data: null, error: updateResult.error };
  }

  return { data: publicUrl, error: null };
};