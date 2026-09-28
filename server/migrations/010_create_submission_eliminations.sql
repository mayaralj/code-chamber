CREATE SEQUENCE public.submission_eliminations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.submission_eliminations (
    id integer DEFAULT nextval('public.submission_eliminations_id_seq'::regclass) NOT NULL,
    submission_id integer NOT NULL,
    eliminated_user_id text,
    eliminated_is_guest boolean DEFAULT false NOT NULL,

    CONSTRAINT submission_eliminations_pkey PRIMARY KEY (id),
    CONSTRAINT submission_eliminations_submission_id_eliminated_user_id_key
        UNIQUE (submission_id, eliminated_user_id),
    CONSTRAINT submission_eliminations_eliminated_user_id_fkey
        FOREIGN KEY (eliminated_user_id)
        REFERENCES public."user"(id)
        ON DELETE SET NULL,
    CONSTRAINT submission_eliminations_submission_id_fkey
        FOREIGN KEY (submission_id)
        REFERENCES public.submissions(id)
        ON DELETE CASCADE
);

ALTER SEQUENCE public.submission_eliminations_id_seq
    OWNED BY public.submission_eliminations.id;
