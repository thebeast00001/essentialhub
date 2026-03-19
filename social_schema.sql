-- Run this SQL in your Supabase SQL Editor to create the tables for the Social Circle

-- 1. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Post Likes Table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, user_id)
);

-- 3. Comments/Threads Table (Reddit Style)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- For nested replies
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Comment Votes Table (Upvotes/Downvotes)
CREATE TABLE IF NOT EXISTS public.comment_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type SMALLINT NOT NULL, -- 1 for upvote, -1 for downvote
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (public includes anon and authenticated)
CREATE POLICY "Allow public read access to posts" ON public.posts FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read access to post_likes" ON public.post_likes FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read access to comments" ON public.comments FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read access to comment_votes" ON public.comment_votes FOR SELECT TO public USING (true);

-- Allow insert for any user providing their ID
CREATE POLICY "Allow public insert posts" ON public.posts FOR INSERT TO public WITH CHECK (user_id IS NOT NULL);
CREATE POLICY "Allow owner update posts" ON public.posts FOR UPDATE TO public USING (true); -- Ideally check user_id here but auth.uid() is null
CREATE POLICY "Allow owner delete posts" ON public.posts FOR DELETE TO public USING (true);

CREATE POLICY "Allow public manage post_likes" ON public.post_likes FOR ALL TO public USING (true);
CREATE POLICY "Allow public manage comments" ON public.comments FOR ALL TO public USING (true);
CREATE POLICY "Allow public manage comment_votes" ON public.comment_votes FOR ALL TO public USING (true);


-- 5. Stories Table
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT,
  content TEXT,
  type TEXT DEFAULT 'image', -- 'image', 'video', 'text'
  metadata JSONB DEFAULT '{}'::jsonb, -- Store customization like {bg: string, color: string, font: string}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to stories" ON public.stories FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert stories" ON public.stories FOR INSERT TO public WITH CHECK (user_id IS NOT NULL);
CREATE POLICY "Allow public delete stories" ON public.stories FOR DELETE TO public USING (true);

-- 6. Story Reactions Table
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  reaction TEXT NOT NULL, -- emoji string
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, user_id, reaction)
);

ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public manage story_reactions" ON public.story_reactions FOR ALL TO public USING (true);

-- 7. Post Votes (Reddit Style)
CREATE TABLE IF NOT EXISTS public.post_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  vote_type SMALLINT NOT NULL, -- 1 for upvote, -1 for downvote
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public manage post_votes" ON public.post_votes FOR ALL TO public USING (true);

-- 8. Follows Table
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public manage follows" ON public.follows FOR ALL TO public USING (true);
