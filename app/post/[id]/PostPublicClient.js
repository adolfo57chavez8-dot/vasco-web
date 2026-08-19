'use client';

import Link from 'next/link';
import PostCard from '../../../components/PostCard';

export default function PostPublicClient({ post }) {
  return (
    <div>
      <div className="public-post-topbar">
        <Link href="/" className="nav-logo">VASCO<span>WEB</span></Link>
        <Link href="/" className="public-post-back">Volver al Feed</Link>
      </div>
      <PostCard post={post} />
    </div>
  );
}
