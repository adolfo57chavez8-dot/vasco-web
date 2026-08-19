import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PostPublicClient from './PostPublicClient';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vasco-web-7jci.vercel.app';

function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function getPost(id) {
  const supabase = getServerSupabase();
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('deleted', false)
    .eq('hidden', false)
    .maybeSingle();

  if (error || !post) return null;

  const { data: author } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', post.user_id)
    .maybeSingle();

  return { ...post, author: author || null };
}

export async function generateMetadata({ params }) {
  const post = await getPost(params.id);
  if (!post) return { title: 'Publicación no encontrada · Vasco Web' };

  const authorName = post.author?.username ? `@${post.author.username}` : 'Vasco Web';
  const title = `${authorName} en Vasco Web`;
  const description = post.description || 'Mira esta publicación en Vasco Web.';
  const media = post.content_type === 'foto' ? [{ url: post.file_url }] : [];

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: `/post/${params.id}` },
    openGraph: {
      title,
      description,
      url: `/post/${params.id}`,
      siteName: 'Vasco Web',
      type: post.content_type === 'video' ? 'video.other' : 'website',
      images: media,
      videos: post.content_type === 'video' ? [{ url: post.file_url }] : undefined,
    },
    twitter: {
      card: post.content_type === 'foto' ? 'summary_large_image' : 'summary',
      title,
      description,
      images: post.content_type === 'foto' ? [post.file_url] : undefined,
    },
  };
}

export default async function PublicPostPage({ params }) {
  const post = await getPost(params.id);
  if (!post) notFound();
  return <PostPublicClient post={post} />;
}

