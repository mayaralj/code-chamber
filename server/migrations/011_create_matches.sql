CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.matches (
    id integer DEFAULT nextval('public.matches_id_seq'::regclass) NOT NULL,
    user_id text NOT NULL,
    difficulty text NOT NULL,
    won boolean,
    played_at timestamp with time zone DEFAULT now() NOT NULL,
    room_id text NOT NULL,
    host_id text,
    survival_time integer,
    host_is_guest boolean DEFAULT false NOT NULL,

    CONSTRAINT matches_pkey PRIMARY KEY (room_id, user_id),
    CONSTRAINT matches_host_id_fkey
        FOREIGN KEY (host_id)
        REFERENCES public."user"(id)
        ON DELETE SET NULL,
    CONSTRAINT matches_room_fkey
        FOREIGN KEY (room_id)
        REFERENCES public.rooms(room_id)
        ON DELETE CASCADE,
    CONSTRAINT matches_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public."user"(id)
        ON DELETE CASCADE
);

ALTER SEQUENCE public.matches_id_seq
    OWNED BY public.matches.id;
