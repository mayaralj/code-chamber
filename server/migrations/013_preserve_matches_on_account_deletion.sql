-- Changed to preserve matches on account deletion but null out the user_id
ALTER TABLE public.matches
    DROP CONSTRAINT matches_user_id_fkey,
    DROP CONSTRAINT matches_pkey;

ALTER TABLE public.matches
    ALTER COLUMN user_id DROP NOT NULL,
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id),
    ADD CONSTRAINT matches_room_user_key UNIQUE (room_id, user_id),
    ADD CONSTRAINT matches_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public."user"(id)
        ON DELETE SET NULL;
