-- ========================================
-- MESSAGING SYSTEM DIAGNOSTIC
-- ========================================
-- Run this in Supabase SQL Editor to identify issues

-- 1. Check if core messaging tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('messages', 'conversations', 'conversation_participants', 'profiles')
ORDER BY tablename;

-- 2. Check if realtime is enabled for messages table
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('messages', 'conversations', 'conversation_participants');

-- 3. Check RLS policies for messaging tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('messages', 'conversations', 'conversation_participants')
ORDER BY tablename, policyname;

-- 4. Check if required RPC functions exist
SELECT 
    proname,
    prokind,
    pronargs,
    proargtypes
FROM pg_proc 
WHERE proname IN ('get_conversation_participants', 'find_direct_conversation')
    AND pronamespace = 'public'::regnamespace;

-- 5. Test basic message insertion (will show RLS errors)
-- Uncomment to test:
-- INSERT INTO public.messages (conversation_id, sender_id, content) 
-- VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'test')
-- RETURNING id;

-- 6. Check foreign key constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('messages', 'conversations', 'conversation_participants')
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;
