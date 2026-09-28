CREATE SEQUENCE public.submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.submissions (
    id integer DEFAULT nextval('public.submissions_id_seq'::regclass) NOT NULL,
    user_id text,
    language text NOT NULL,
    difficulty text NOT NULL,
    passed boolean NOT NULL,
    execution_time numeric(10,3),
    submit_time numeric(10,3),
    test_cases_passed integer DEFAULT 0 NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    room_id text NOT NULL,
    round_number integer DEFAULT 1 NOT NULL,
    total_test_cases integer,

    CONSTRAINT submissions_pkey PRIMARY KEY (id),
    CONSTRAINT submissions_room_fkey
        FOREIGN KEY (room_id)
        REFERENCES public.rooms(room_id)
        ON DELETE CASCADE,
    CONSTRAINT submissions_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public."user"(id)
        ON DELETE SET NULL
);

ALTER SEQUENCE public.submissions_id_seq
    OWNED BY public.submissions.id;
