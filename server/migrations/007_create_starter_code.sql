CREATE SEQUENCE public.starter_code_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.starter_code (
    id integer DEFAULT nextval('public.starter_code_id_seq'::regclass) NOT NULL,
    question_id integer,
    language character varying(20) NOT NULL,
    code text NOT NULL,
    function_name text NOT NULL,
    param_types jsonb,

    CONSTRAINT starter_code_pkey PRIMARY KEY (id),
    CONSTRAINT starter_code_question_id_fkey
        FOREIGN KEY (question_id)
        REFERENCES public.questions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

ALTER SEQUENCE public.starter_code_id_seq
    OWNED BY public.starter_code.id;
