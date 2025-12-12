import { supabase } from '../supabaseClient';

export const arApi = {
  getAll: async () => {
    return await supabase
      .from('ar_model')
      .select('id, model_name, file_url');
  }
};