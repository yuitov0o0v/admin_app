import { useState } from 'react';
import { supabase } from '../supabaseClient'; // Supabaseクライアントのパスは適宜調整

// フックが返す値の型を定義
interface UseSupabaseStorageReturn {
  uploadFile: (bucketName: string, file: File) => Promise<string | null>;
  isUploading: boolean;
  error: Error | null;
}

export const useSupabaseStorage = (): UseSupabaseStorageReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * ファイルをSupabase Storageにアップロードし、公開URLを返す関数
   * @param bucketName - アップロード先のバケット名
   * @param file - アップロードするファイルオブジェクト
   * @returns アップロードされたファイルの公開URL、失敗した場合はnull
   */
  const uploadFile = async (bucketName: string, file: File): Promise<string | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // ファイル名が重複しないように、現在時刻のタイムスタンプを先頭に付与
      const filePath = `public/${Date.now()}_${file.name}`;

      // 1. ファイルをアップロード
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. アップロードしたファイルの公開URLを取得
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
          throw new Error('公開URLの取得に失敗しました。');
      }

      // 成功したら公開URLを返す
      return data.publicUrl;

    } catch (e: any) {
      console.error('Upload failed:', e);
      setError(e);
      return null; // 失敗した場合はnullを返す
    } finally {
      setIsUploading(false);
    }
  };

  // 関数と状態を返す
  return { uploadFile, isUploading, error };
};