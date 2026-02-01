-- ========================================
-- FIX MESSAGING REAL-TIME
-- ========================================
-- Run this to enable real-time for messaging

-- Enable realtime for all messaging tables (handles already-enabled tables)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.conversation_participants;  
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;

-- Verify it worked
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('messages', 'conversations', 'conversation_participants')
ORDER BY tablename;
