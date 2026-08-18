# Vasco Web

## 1. Instalar dependencias
```
npm install
```

## 2. Pegar tu URL y API key
Abre el archivo **`.env.local`** (en la raíz del proyecto) y reemplaza:

```
NEXT_PUBLIC_SUPABASE_URL=PEGA_AQUI_TU_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=PEGA_AQUI_TU_ANON_KEY
```

Las encuentras en tu dashboard: **Settings > API** → "Project URL" y "anon public" key.

## 3. Correr el proyecto
```
npm run dev
```
Abre http://localhost:3000

## ⚠️ Pendiente importante: políticas RLS
Ninguna de tus tablas (`profiles`, `posts`, `comments`, `reactions`, `profile_views`) ni los buckets
(`avatars`, `posts-media`) tienen políticas creadas todavía. Sin políticas, las consultas devuelven
vacío o fallan. Antes de probar la app en serio, crea al menos estas políticas básicas en el SQL Editor
de Supabase (ajústalas a tus reglas de negocio):

```sql
-- profiles: cualquiera puede leer, solo el dueño edita
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- posts: cualquiera puede leer, solo el dueño inserta/edita
create policy "posts_select" on posts for select using (true);
create policy "posts_insert_own" on posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on posts for update using (auth.uid() = user_id);

-- comments
create policy "comments_select" on comments for select using (true);
create policy "comments_insert_own" on comments for insert with check (auth.uid() = user_id);

-- reactions
create policy "reactions_select" on reactions for select using (true);
create policy "reactions_insert_own" on reactions for insert with check (auth.uid() = user_id);

-- profile_views
create policy "profile_views_select" on profile_views for select using (true);
create policy "profile_views_insert_own" on profile_views for insert with check (auth.uid() = visitor_id);

-- Storage: buckets avatars y posts-media (públicos para lectura)
create policy "avatars_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_upload_own" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "posts_media_read" on storage.objects for select using (bucket_id = 'posts-media');
create policy "posts_media_upload_own" on storage.objects for insert with check (
  bucket_id = 'posts-media' and auth.uid()::text = (storage.foldername(name))[1]
);
```

## Estructura
- `app/login` – registro / inicio de sesión
- `app/upload` – publicar foto o video
- `app/profile` – ver/editar perfil y avatar
- `app/page.js` – feed principal (posts + reacciones + comentarios)
- `lib/supabaseClient.js` – conexión a Supabase (lee `.env.local`)
