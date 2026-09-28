CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.questions (
    id integer DEFAULT nextval('public.questions_id_seq'::regclass) NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    difficulty character varying(20) DEFAULT 'EASY'::character varying NOT NULL,

    CONSTRAINT questions_pkey PRIMARY KEY (id),
    CONSTRAINT questions_title_unique UNIQUE (title),
    CONSTRAINT difficulty_lowercase_check
        CHECK (((difficulty)::text = lower((difficulty)::text)))
);

ALTER SEQUENCE public.questions_id_seq
    OWNED BY public.questions.id;
