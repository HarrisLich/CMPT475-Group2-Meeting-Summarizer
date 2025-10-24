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
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file);
    
  if (error) return { data: null, error };
  
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);
    
  // Update profile with new avatar URL
  await updateProfile({ avatar_url: urlData.publicUrl });
  
  return { data: urlData.publicUrl, error: null };
};