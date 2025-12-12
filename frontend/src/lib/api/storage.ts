import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export const storageApi = {
  uploadSpotImage: async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('spot-images') // バケット名はSupabase側で作成しておく必要があります
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('spot-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  uploadEventImage: async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('event-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
