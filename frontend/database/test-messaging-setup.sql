-- ========================================
-- MESSAGING SYSTEM TEST & VERIFICATION
-- ========================================
-- Run this after applying fix-messaging-complete.sql
-- This will verify all messaging components are properly set up

\echo ''
\echo '=========================================='
\echo 'MESSAGING SYSTEM VERIFICATION'
\echo '=========================================='
\echo ''

-- 1. Check if all required tables exist
\echo '1. Checking tables...'
SELECT
    CASE
        WHEN COUNT(*) = 3 THEN '✅ All messaging tables exist'
        ELSE '❌ Missing tables: ' || (3 - COUNT(*)::text)
    END as status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('conversations', 'conversation_participants', 'messages');

-- List existing tables
SELECT '  - ' || tablename as "Tables Found"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename;

\echo ''

-- 2. Check if required columns exist in conversations table
\echo '2. Checking conversations table columns...'
SELECT
    CASE
        WHEN COUNT(*) >= 7 THEN '✅ All required columns exist'
        ELSE '❌ Missing columns'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'conversations'
    AND column_name IN ('id', 'name', 'type', 'created_by', 'org_id', 'class_section_id', 'created_at');

-- List columns
SELECT '  - ' || column_name || ' (' || data_type || ')' as "Columns"
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'conversations'
ORDER BY ordinal_position;

\echo ''

-- 3. Check if RLS is enabled
\echo '3. Checking Row Level Security...'
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename;

\echo ''

-- 4. Check RLS policies count
\echo '4. Checking RLS policies...'
SELECT
    tablename,
    COUNT(*) as policy_count,
    CASE
        WHEN COUNT(*) >= 3 THEN '✅ Has policies'
        ELSE '⚠️  Few policies'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('conversations', 'conversation_participants', 'messages')
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- 5. Check if required RPC functions exist
\echo '5. Checking RPC functions...'
SELECT
    CASE
        WHEN COUNT(*) >= 3 THEN '✅ All RPC functions exist'
        ELSE '❌ Missing RPC functions: ' || (3 - COUNT(*)::text)
    END as status
FROM pg_proc
WHERE proname IN ('find_or_create_direct_chat', 'find_direct_conversation', 'get_conversation_participants')
    AND pronamespace = 'public'::regnamespace;

-- List functions
SELECT '  - ' || proname || '(' || pronargs || ' args)' as "Functions"
FROM pg_proc
WHERE proname IN ('find_or_create_direct_chat', 'find_direct_conversation', 'get_conversation_participants')
    AND pronamespace = 'public'::regnamespace
ORDER BY proname;

\echo ''

-- 6. Check realtime configuration
\echo '6. Checking realtime subscription...'
SELECT
    schemaname,
    tablename,
    '✅ Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('messages', 'conversations', 'conversation_participants')
ORDER BY tablename;

-- Check if any tables are missing from realtime
SELECT
    t.tablename,
    '❌ Realtime NOT enabled' as status
FROM pg_tables t
WHERE t.schemaname = 'public'
    AND t.tablename IN ('messages', 'conversations', 'conversation_participants')
    AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables pt
        WHERE pt.pubname = 'supabase_realtime'
            AND pt.schemaname = 'public'
            AND pt.tablename = t.tablename
    );

\echo ''

-- 7. Check indexes
\echo '7. Checking indexes...'
SELECT
    CASE
        WHEN COUNT(*) >= 5 THEN '✅ Key indexes exist'
        ELSE '⚠️  Missing some indexes'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname IN (
        'idx_messages_conversation_id',
        'idx_messages_sender_id',
        'idx_conversation_participants_user_id',
        'idx_conversations_org_id',
        'idx_conversations_class_section_id'
    );

-- List indexes
SELECT '  - ' || indexname as "Indexes"
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('messages', 'conversations', 'conversation_participants')
ORDER BY tablename, indexname;

\echo ''
\echo '=========================================='
\echo 'VERIFICATION COMPLETE'
\echo '=========================================='
\echo ''
\echo 'If all checks show ✅, your messaging system is ready!'
\echo 'If you see any ❌, re-run fix-messaging-complete.sql'
\echo ''
