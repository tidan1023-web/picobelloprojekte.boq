import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, Trash2, CornerDownRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_BADGE = {
  admin: 'bg-red-100 text-red-700',
  qs: 'bg-purple-100 text-purple-700',
  project_manager: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
};

function Comment({ comment, projectId, onReply, onDelete, depth = 0 }) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      await onReply(replyText.trim(), comment._id);
      setReplyText('');
      setReplyOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const canDelete = user?._id === comment.userId?._id || user?.role === 'admin';

  return (
    <div className={`${depth > 0 ? 'ml-4 sm:ml-8 border-l-2 border-gray-100 pl-3 sm:pl-4' : ''}`}>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-900 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {comment.userId?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <span className="text-sm font-semibold text-gray-800">{comment.userId?.name || 'Unknown'}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_BADGE[comment.userId?.role] || 'bg-gray-100 text-gray-500'}`}>
              {comment.userId?.role?.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {new Date(comment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            {canDelete && (
              <button onClick={() => onDelete(comment._id)} className="text-gray-300 hover:text-red-500">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{comment.message}</p>
        {depth === 0 && (
          <button onClick={() => setReplyOpen((o) => !o)}
            className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-primary-900 transition-colors">
            <CornerDownRight size={12} /> Reply
          </button>
        )}
        {replyOpen && (
          <form onSubmit={handleReply} className="mt-2 flex gap-2">
            <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30" />
            <button type="submit" disabled={saving || !replyText.trim()}
              className="bg-primary-900 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-primary-800 disabled:opacity-60">
              <Send size={13} />
            </button>
          </form>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((r) => (
            <Comment key={r._id} comment={r} projectId={projectId} onReply={onReply} onDelete={onDelete} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientComments() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const [projects, setProjects] = useState([]);
  const [selProjectId, setSelProjectId] = useState(projectId);
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/projects').then(({ data }) => setProjects(data.projects || []));
  }, []);

  const loadComments = async (pid) => {
    if (!pid) return;
    setLoading(true);
    try {
      const { data } = await api.get('/comments', { params: { projectId: pid } });
      setComments(data.comments || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComments(selProjectId); }, [selProjectId]);

  const postComment = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selProjectId) return;
    setPosting(true);
    try {
      await api.post('/comments', { projectId: selProjectId, message: message.trim() });
      setMessage('');
      await loadComments(selProjectId);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (text, parentId) => {
    await api.post('/comments', { projectId: selProjectId, message: text, parentId });
    await loadComments(selProjectId);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this comment?')) return;
    await api.delete(`/comments/${id}`);
    await loadComments(selProjectId);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl space-y-4">
      {/* Project selector */}
      <select value={selProjectId} onChange={(e) => setSelProjectId(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-900/30 w-full sm:w-64">
        <option value="">Select project…</option>
        {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
      </select>

      {!selProjectId ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
          <p>Select a project to view comments</p>
        </div>
      ) : loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-auto">
            {comments.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
                <p>No comments yet. Start the conversation.</p>
              </div>
            ) : (
              comments.map((c) => (
                <Comment key={c._id} comment={c} projectId={selProjectId} onReply={handleReply} onDelete={handleDelete} />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={postComment} className="flex gap-2 pt-2 border-t border-gray-100">
            <input value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30" />
            <button type="submit" disabled={posting || !message.trim()}
              className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              <Send size={14} /> Post
            </button>
          </form>
        </>
      )}
    </div>
  );
}
