CREATE TABLE public.rooms (
    room_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,

    CONSTRAINT rooms_pkey PRIMARY KEY (room_id)
);
