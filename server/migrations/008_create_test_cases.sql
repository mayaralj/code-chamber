CREATE SEQUENCE public.test_cases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.test_cases (
    id integer DEFAULT nextval('public.test_cases_id_seq'::regclass) NOT NULL,
    question_id integer,
    input jsonb NOT NULL,
    expected jsonb NOT NULL,

    CONSTRAINT test_cases_pkey PRIMARY KEY (id),
    CONSTRAINT test_cases_question_id_fkey
        FOREIGN KEY (question_id)
        REFERENCES public.questions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

ALTER SEQUENCE public.test_cases_id_seq
    OWNED BY public.test_cases.id;
