-- ========================================
-- CORE MESSAGING SYSTEM SETUP
-- ========================================
-- Run this first if messaging tables don't exist

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'org')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create conversation_participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT '1970-01-01',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- 5. Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. Basic RLS policies (minimal working version)
-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants 
            WHERE conversation_id = conversations.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert conversations" ON public.conversations
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update conversations they created" ON public.conversations
    FOR UPDATE USING (created_by = auth.uid());

-- Conversation participants policies
CREATE POLICY "Users can view their own conversation participation" ON public.conversation_participants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert conversation participation" ON public.conversation_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" ON public.conversation_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own participation" ON public.conversation_participants
    FOR DELETE USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in conversations they participate in" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants 
            WHERE conversation_id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in conversations they participate in" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants 
            WHERE conversation_id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE USING (sender_id = auth.uid());

-- 7. Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 8. Create essential RPC functions
CREATE OR REPLACE FUNCTION public.find_direct_conversation(user1 UUID, user2 UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_conversation UUID;
BEGIN
    -- Find conversation where both users are participants
    SELECT c.id INTO found_conversation
    FROM public.conversations c
    JOIN public.conversation_participants p1 ON c.id = p1.conversation_id
    JOIN public.conversation_participants p2 ON c.id = p2.conversation_id
    WHERE c.type = 'direct'
        AND p1.user_id = user1
        AND p2.user_id = user2
        AND p1.user_id != p2.user_id
    LIMIT 1;
    
    RETURN found_conversation;
END;
$$;

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

-- 9. Update triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER handle_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
