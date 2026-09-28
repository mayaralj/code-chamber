CREATE SEQUENCE public.solutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.solutions (
    id integer DEFAULT nextval('public.solutions_id_seq'::regclass) NOT NULL,
    question_id integer,
    language character varying(20) NOT NULL,
    code text NOT NULL,
    function_name text NOT NULL,
    approach character varying(30) DEFAULT 'optimal'::character varying NOT NULL,

    CONSTRAINT solutions_pkey PRIMARY KEY (id),
    CONSTRAINT solutions_question_id_language_approach_key
        UNIQUE (question_id, language, approach),
    CONSTRAINT solutions_question_id_fkey
        FOREIGN KEY (question_id)
        REFERENCES public.questions(id)
        ON DELETE CASCADE
);

ALTER SEQUENCE public.solutions_id_seq
    OWNED BY public.solutions.id;
