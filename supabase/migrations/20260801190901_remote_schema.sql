-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;

CREATE TABLE public."account deletion requests" (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id    uuid,
  user_email character varying,
  message    text
);

ALTER TABLE public."account deletion requests"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."account deletion requests"
  ADD CONSTRAINT "account deletion requests_pkey" PRIMARY KEY (id);

GRANT ALL ON public."account deletion requests" TO anon;

GRANT ALL ON public."account deletion requests" TO authenticated;

GRANT ALL ON public."account deletion requests" TO service_role;

CREATE POLICY "Insert Policy" ON public."account deletion requests"
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.friends (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id    uuid,
  friend_id  uuid,
  status     character varying
);

ALTER TABLE public.friends
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.friends
  ADD CONSTRAINT friends_no_self_check CHECK (user_id <> friend_id);

ALTER TABLE public.friends
  ADD CONSTRAINT friends_pkey PRIMARY KEY (id);

ALTER TABLE public.friends
  ADD CONSTRAINT friends_status_check
    CHECK (status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'blocked'::character varying]::text[]));

GRANT ALL ON public.friends TO anon;

GRANT ALL ON public.friends TO authenticated;

GRANT ALL ON public.friends TO service_role;

CREATE UNIQUE INDEX friends_unique_active_pair ON public.friends (LEAST(user_id, friend_id), GREATEST(user_id, friend_id))
  WHERE status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying]::text[]);

CREATE UNIQUE INDEX friends_unique_pending_direction ON public.friends (user_id, friend_id)
  WHERE status::text = 'pending'::text;

CREATE POLICY "Delete Policy" ON public.friends
  FOR DELETE
  TO authenticated
  USING (((auth.uid() = user_id) OR (auth.uid() = friend_id)));

CREATE POLICY "Insert Policy" ON public.friends
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Select Policy" ON public.friends
  FOR SELECT
  TO authenticated
  USING (((auth.uid() = user_id) OR (auth.uid() = friend_id)));

CREATE POLICY "update policy" ON public.friends
  FOR UPDATE
  TO authenticated
  USING (((auth.uid() = user_id) OR (auth.uid() = friend_id)))
  WITH CHECK (((auth.uid() = user_id) OR (auth.uid() = friend_id)));

CREATE TABLE public.messages (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  sender_id       uuid,
  receiver_id     uuid,
  message         text,
  conversation_id text,
  file_path       text,
  type            text,
  file_name       text,
  storage_path    text
);

ALTER TABLE public.messages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages
  REPLICA IDENTITY FULL;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

GRANT ALL ON public.messages TO anon;

GRANT ALL ON public.messages TO authenticated;

GRANT ALL ON public.messages TO service_role;

CREATE INDEX idx_messages_conversation_id ON public.messages (conversation_id);

CREATE POLICY "select" ON public.messages
  FOR SELECT
  TO authenticated
  USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));

CREATE POLICY delete ON public.messages
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = sender_id));

CREATE POLICY insert ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = sender_id));

CREATE POLICY update ON public.messages
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = sender_id))
  WITH CHECK ((auth.uid() = sender_id));

CREATE TABLE public.profiles (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  email      character varying        NOT NULL,
  username   character varying        NOT NULL,
  status     boolean
);

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_key UNIQUE (email);

GRANT ALL ON public.profiles TO anon;

GRANT ALL ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "Insert Policy" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Select Policy" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Update Policy" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));

CREATE TABLE public.support (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id    uuid,
  user_email character varying,
  message    text
);

ALTER TABLE public.support
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support
  ADD CONSTRAINT support_pkey PRIMARY KEY (id);

GRANT ALL ON public.support TO anon;

GRANT ALL ON public.support TO authenticated;

GRANT ALL ON public.support TO service_role;

CREATE POLICY "Insert Policy" ON public.support
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
