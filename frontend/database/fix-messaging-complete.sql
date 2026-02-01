-- ========================================
-- COMPLETE MESSAGING SYSTEM FIX
-- ========================================
-- This script will fix all messaging issues
-- Run this in Supabase SQL Editor

-- 1. Add missing columns to conversations table (if they don't exist)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS class_section_id UUID;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON public.conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_class_section_id ON public.conversations(class_section_id);

-- Update type constraint to include 'class' type
ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS conversations_type_check;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_type_check
CHECK (type IN ('direct', 'group', 'org', 'class'));

-- 2. Create the find_or_create_direct_chat RPC function (this is what the app actually calls)
CREATE OR REPLACE FUNCTION public.find_or_create_direct_chat(
    p_user1_id UUID,
    p_user2_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- First, try to find an existing direct conversation between these two users
    SELECT c.id INTO v_conversation_id
    FROM public.conversations c
    WHERE c.type = 'direct'
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp1
            WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user1_id
        )
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp2
            WHERE cp2.conversation_id = c.id AND cp2.user_id = p_user2_id
        )
        AND (
            SELECT COUNT(*) FROM public.conversation_participants cp
            WHERE cp.conversation_id = c.id
        ) = 2
    LIMIT 1;

    -- If found, return it
    IF v_conversation_id IS NOT NULL THEN
        RETURN v_conversation_id;
    END IF;

    -- If not found, create a new conversation
    INSERT INTO public.conversations (type, created_by)
    VALUES ('direct', p_user1_id)
    RETURNING id INTO v_conversation_id;

    -- Add both participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES
        (v_conversation_id, p_user1_id),
        (v_conversation_id, p_user2_id);

    RETURN v_conversation_id;
END;
$$;

-- 3. Ensure get_conversation_participants function exists and is correct
CREATE OR REPLACE FUNCTION public.get_conversation_participants(conv_id UUID)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.username,
        p.avatar_url
    FROM public.profiles p
    JOIN public.conversation_participants cp ON p.id = cp.user_id
    WHERE cp.conversation_id = conv_id
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = conv_id
            AND user_id = auth.uid()
        );
END;
$$;

-- 4. Ensure find_direct_conversation function exists (for compatibility)
CREATE OR REPLACE FUNCTION public.find_direct_conversation(user1 UUID, user2 UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_conversation UUID;
BEGIN
    SELECT c.id INTO found_conversation
    FROM public.conversations c
    WHERE c.type = 'direct'
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp1
            WHERE cp1.conversation_id = c.id AND cp1.user_id = user1
        )
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp2
            WHERE cp2.conversation_id = c.id AND cp2.user_id = user2
        )
        AND (
            SELECT COUNT(*) FROM public.conversation_participants cp
            WHERE cp.conversation_id = c.id
        ) = 2
    LIMIT 1;

    RETURN found_conversation;
END;
$$;

-- 5. Add policy for inserting other users as participants (for direct chat creation)
DROP POLICY IF EXISTS "Users can add other users to direct chats" ON public.conversation_participants;
CREATE POLICY "Users can add other users to direct chats" ON public.conversation_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND c.created_by = auth.uid()
        )
    );

-- 6. Update RLS policies for better coverage
-- Allow users to view all conversations they're part of (including metadata)
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = conversations.id
            AND user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

-- 7. Add policy to view other participants in the same conversation
DROP POLICY IF EXISTS "Users can view other participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view other participants in their conversations" ON public.conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- 8. Enable realtime for all messaging tables
DO $$
BEGIN
    -- Enable realtime for messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    -- Enable realtime for conversations
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;

    -- Enable realtime for conversation_participants
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'conversation_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
    END IF;
END $$;

-- 9. Create trigger to auto-update conversation.updated_at on new message
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON public.messages;
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_timestamp();

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_create_direct_chat TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_direct_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_participants TO authenticated;

-- Done!
SELECT 'Messaging system fixed! ✅' as status;
