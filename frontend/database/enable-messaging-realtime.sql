-- ========================================
-- ENABLE REALTIME FOR MESSAGING
-- ========================================
-- Run this to fix real-time subscription issues

-- 1. Check current realtime publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 2. Ensure realtime is enabled for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;

-- 3. Verify realtime is enabled
SELECT 
    schemaname,
    tablename,
    replica_identity
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename;
