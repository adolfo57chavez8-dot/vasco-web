'use client';

export default function PostGrid({ posts, onSelect, emptyText }) {
  if (!posts || posts.length === 0) {
    return (
      <div className="state-block">
        <div className="state-title">{emptyText || 'Nada por aquí todavía'}</div>
      </div>
    );
  }

  return (
    <div className="post-grid">
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          className="grid-thumb"
          onClick={() => onSelect(post)}
        >
          {post.content_type === 'video' ? (
            <>
              <video src={post.file_url} muted playsInline />
              <span className="grid-thumb-badge">▶</span>
            </>
          ) : (
            <img src={post.file_url} alt={post.description || ''} loading="lazy" />
          )}
        </button>
      ))}
    </div>
  );
}
