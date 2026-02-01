-- Enable Realtime for Link AI Tables
-- Run this script in your Supabase SQL Editor to enable realtime updates for Link chat

-- Enable realtime for link_messages table (for live chat updates)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.link_messages;

-- Enable realtime for link_conversations table (for preview updates)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.link_conversations;

-- Verify the tables were added
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('link_messages', 'link_conversations');
