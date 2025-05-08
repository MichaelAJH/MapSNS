import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface CreatePostProps {
  latitude: number;
  longitude: number;
  onPostCreated: () => void;
}

export default function CreatePost({ latitude, longitude, onPostCreated }: CreatePostProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!image || !text) {
      setError('Please provide both text and an image');
      return;
    }

    // Validate image size (max 5MB)
    if (image.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    // Validate image type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(image.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    setIsUploading(true);
    try {
      // Upload image to Supabase Storage
      const fileExt = image.name.split('.').pop();
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `${timestamp}-${randomString}.${fileExt}`;
      
      console.log('Attempting to upload image:', fileName);
      const { data: imageData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, image);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // Get the public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      console.log('Image uploaded successfully, creating post...');
      // Create the post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          text,
          image_url: publicUrl,
          latitude,
          longitude,
          views: 0
        })
        .select()
        .single();

      if (postError) {
        console.error('Database insert error:', postError);
        throw new Error(`Failed to create post: ${postError.message || 'Unknown error'}`);
      }

      if (!postData) {
        throw new Error('Failed to create post: No data returned');
      }

      console.log('Post created successfully:', postData);

      setText('');
      setImage(null);
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error instanceof Error ? error.message : 'Failed to create post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-lg">
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your message..."
        className="w-full p-2 border rounded text-gray-900"
        rows={3}
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] || null)}
        className="mt-2 text-gray-900"
      />
      <button
        type="submit"
        disabled={isUploading || !image || !text}
        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300 disabled:opacity-50"
      >
        {isUploading ? 'Uploading...' : 'Post'}
      </button>
    </form>
  );
} 