import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Comment } from '../lib/supabase';

interface CommentsProps {
  postId: string;
}

export default function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    setComments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          text: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Comments</h3>
      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full p-2 border rounded text-gray-900"
          rows={2}
        />
        <button
          type="submit"
          disabled={isLoading || !newComment.trim()}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300 disabled:opacity-50"
        >
          {isLoading ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
      <div className="space-y-2">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 p-2 rounded">
            <p className="text-sm text-gray-900">{comment.text}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(comment.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
} 