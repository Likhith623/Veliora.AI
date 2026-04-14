-- Create table for user's own custom contest questions
CREATE TABLE IF NOT EXISTS public.user_custom_questions_realtime (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles_realtime(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_custom_questions_realtime ENABLE ROW LEVEL SECURITY;

-- Allow users to read all questions (for fetching friends' questions during contests)
CREATE POLICY "Users can view all custom questions"
ON public.user_custom_questions_realtime FOR SELECT
USING (true);

-- Allow users to insert/update their own questions
CREATE POLICY "Users can insert their own custom questions"
ON public.user_custom_questions_realtime FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom questions"
ON public.user_custom_questions_realtime FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom questions"
ON public.user_custom_questions_realtime FOR DELETE
USING (auth.uid() = user_id);
