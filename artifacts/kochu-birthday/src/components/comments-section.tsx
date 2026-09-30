import { useState, type FormEvent } from 'react';
import { MessageCircle, Heart, Trash2, Edit2, Eye, EyeOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { MemoryComment, GiftComment, SessionUser } from '@workspace/api-client-react';

interface CommentsSectionProps {
  comments: (MemoryComment | GiftComment)[];
  currentUser?: SessionUser | null;
  onPostComment: (comment: string) => void;
  onEditComment?: (commentId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleHideComment?: (commentId: string, hidden: boolean) => void;
  isPending?: boolean;
}

export function CommentsSection({
  comments,
  currentUser,
  onPostComment,
  onEditComment,
  onDeleteComment,
  onToggleHideComment,
  isPending,
}: CommentsSectionProps) {
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onPostComment(newText.trim());
    setNewText('');
  };

  const startEdit = (c: MemoryComment | GiftComment) => {
    setEditingId(c.id);
    setEditText(c.comment);
  };

  const saveEdit = (id: string) => {
    if (onEditComment && editText.trim()) {
      onEditComment(id, editText.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border/70 pb-4">
        <MessageCircle size={20} className="text-primary" />
        <h3 className="serif text-2xl">💬 Comments</h3>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {comments.length} {comments.length === 1 ? 'thought' : 'thoughts'}
        </span>
      </div>

      {/* Post Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3 rise-in">
        <Textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[90px] rounded-2xl bg-card border-border text-sm leading-relaxed p-4"
          data-testid="input-comment-text"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!newText.trim() || isPending}
            className="rounded-xl px-5 text-sm gap-2"
            data-testid="button-post-comment"
          >
            {isPending ? 'Posting…' : 'POST COMMENT'} <Heart size={14} />
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((c) => {
          const isOwn = c.userId === currentUser?.id;
          const isEditing = editingId === c.id;

          return (
            <div
              key={c.id}
              className={cn(
                'ink-card rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-all',
                c.hidden && 'opacity-50 border-destructive/30 bg-destructive/5',
              )}
              data-testid={`comment-${c.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {(c.userName || 'K').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-semibold block leading-none">{c.userName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.userRole === 'ADMIN' ? 'Kunju' : 'Kochu'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Kochu Edit/Delete Own Comment */}
                  {isOwn && !isAdmin && onEditComment && !isEditing && (
                    <button
                      onClick={() => startEdit(c)}
                      className="p-1.5 text-muted-foreground hover:text-foreground focus-ring rounded"
                      aria-label="Edit comment"
                      data-testid={`button-edit-comment-${c.id}`}
                    >
                      <Edit2 size={14} />
                    </button>
                  )}

                  {/* Delete (Kochu own or Admin) */}
                  {(isOwn || isAdmin) && !isEditing && (
                    <button
                      onClick={() => onDeleteComment(c.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive focus-ring rounded"
                      aria-label="Delete comment"
                      data-testid={`button-delete-comment-${c.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  {/* Admin Hide/Restore Toggle (Admin cannot edit Kochu's text!) */}
                  {isAdmin && onToggleHideComment && !isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleHideComment(c.id, !c.hidden)}
                      className="h-7 text-[11px] px-2 gap-1 rounded-lg"
                      data-testid={`button-toggle-hide-comment-${c.id}`}
                    >
                      {c.hidden ? (
                        <>
                          <Eye size={13} /> RESTORE
                        </>
                      ) : (
                        <>
                          <EyeOff size={13} /> HIDE
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Comment Content */}
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[70px] text-sm bg-background"
                    data-testid={`input-edit-comment-${c.id}`}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="h-8 text-xs"
                      data-testid={`button-cancel-edit-comment-${c.id}`}
                    >
                      <X size={14} /> CANCEL
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveEdit(c.id)}
                      className="h-8 text-xs gap-1"
                      data-testid={`button-save-comment-${c.id}`}
                    >
                      <Check size={14} /> SAVE COMMENT
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                  {c.comment}
                </p>
              )}
            </div>
          );
        })}

        {comments.length === 0 && (
          <p className="text-center text-xs text-muted-foreground italic py-4">
            No comments yet. Leave the first little note.
          </p>
        )}
      </div>
    </div>
  );
}
