-- Enable full replica identity for comment_votes to ensure DELETE payloads contain all columns (comment_id)
ALTER TABLE public.comment_votes REPLICA IDENTITY FULL;
