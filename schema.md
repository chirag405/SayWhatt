create table public.answers (
id uuid not null default gen_random_uuid (),
player_id uuid not null,
answer_text text not null,
ai_response text null,
ai_points integer null,
vote_points integer null default 0,
created_at timestamp with time zone null default now(),
turn_id uuid not null,
constraint answers_pkey primary key (id),
constraint unique_player_turn_answer unique (turn_id, player_id),
constraint answers_player_id_fkey foreign KEY (player_id) references players (id) on delete CASCADE,
constraint answers_turn_id_fkey foreign KEY (turn_id) references turns (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger answer_points_update
after INSERT
or
update on answers for EACH row
execute FUNCTION update_player_points ();

create table public.decider_history (
id uuid not null default gen_random_uuid (),
round_id uuid not null,
player_id uuid not null,
turn_number integer not null,
created_at timestamp with time zone null default now(),
constraint decider_history_pkey primary key (id),
constraint decider_history_round_player_unique unique (round_id, player_id),
constraint decider_history_player_id_fkey foreign KEY (player_id) references players (id) on delete CASCADE,
constraint decider_history_round_id_fkey foreign KEY (round_id) references rounds (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_decider_history_round_id on public.decider_history using btree (round_id) TABLESPACE pg_default;

create table public.game_statistics (
id uuid not null default gen_random_uuid (),
rooms_created integer not null default 0,
players_participated integer not null default 0,
last_updated timestamp with time zone null default now(),
constraint game_statistics_pkey primary key (id)
) TABLESPACE pg_default;

create table public.players (
id uuid not null default gen_random_uuid (),
room_id uuid not null,
nickname character varying(50) not null,
is_host boolean null default false,
total_points integer null default 0,
created_at timestamp with time zone null default now(),
updated_at timestamp with time zone null default now(),
has_been_decider boolean null default false,
constraint players_pkey primary key (id),
constraint players_room_id_nickname_key unique (room_id, nickname),
constraint players_room_id_fkey foreign KEY (room_id) references rooms (id) on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists single_host_per_room on public.players using btree (room_id) TABLESPACE pg_default
where
(is_host is true);

create trigger handle_player_deletion_trigger BEFORE DELETE on players for EACH row
execute FUNCTION handle_player_deletion ();

create trigger reassign_turns_after_player_deletion_trigger
after DELETE on players for EACH row
execute FUNCTION reassign_turns_after_player_deletion ();

create trigger track_new_player
after INSERT on players for EACH row
execute FUNCTION increment_player_count ();

create trigger trigger_delete_inactive_players
after DELETE on players for EACH row
execute FUNCTION delete_inactive_player_data ();

create trigger trigger_reassign_host
after DELETE on players for EACH row
execute FUNCTION reassign_host ();
create table public.rooms (
id uuid not null default gen_random_uuid (),
room_code character varying(10) not null,
total_rounds integer not null,
time_limit integer not null,
current_round integer null default 0,
created_at timestamp with time zone null default now(),
updated_at timestamp with time zone null default now(),
game_status character varying(20) null default 'waiting'::character varying,
expires_at timestamp with time zone null default (now() + '24:00:00'::interval),
host_id uuid null,
round_voting_phase boolean null default false,
current_turn integer null default 0,
constraint rooms_pkey primary key (id),
constraint rooms_room_code_key unique (room_code),
constraint rooms_host_id_fkey foreign KEY (host_id) references players (id) on delete set null,
constraint rooms_game_status_check check (
(
(game_status)::text = any (
array[
('waiting'::character varying)::text,
('in_progress'::character varying)::text,
('completed'::character varying)::text
]
)
)
)
) TABLESPACE pg_default;

create trigger track_new_room
after INSERT on rooms for EACH row
execute FUNCTION increment_room_count ();

create trigger trigger_schedule_room_cleanup BEFORE
update OF game_status on rooms for EACH row
execute FUNCTION schedule_room_cleanup ();

create table public.rounds (
id uuid not null default gen_random_uuid (),
room_id uuid not null,
round_number integer not null,
status character varying(20) not null default 'selecting_category'::character varying,
created_at timestamp with time zone null default now(),
updated_at timestamp with time zone null default now(),
is_complete boolean null default false,
remaining_deciders integer null,
current_turn integer null default 1,
constraint rounds_pkey primary key (id),
constraint rounds_room_id_fkey foreign KEY (room_id) references rooms (id) on delete CASCADE,
constraint rounds_round_number_check check ((round_number > 0)),
constraint rounds_status_check check (
(
(status)::text = any (
array[
('selecting_category'::character varying)::text,
('selecting_scenario'::character varying)::text,
('answering'::character varying)::text,
('voting'::character varying)::text,
('completed'::character varying)::text
]
)
)
)
) TABLESPACE pg_default;create table public.scenarios (
id uuid not null default gen_random_uuid (),
scenario_text text not null,
is_custom boolean not null default false,
created_at timestamp with time zone null default now(),
turn_id uuid not null,
constraint scenarios_pkey primary key (id),
constraint scenarios_turn_id_fkey foreign KEY (turn_id) references turns (id) on delete CASCADE
) TABLESPACE pg_default;
create table public.turns (
id uuid not null default gen_random_uuid (),
round_id uuid not null,
turn_number integer not null,
decider_id uuid not null,
category character varying(50) null,
scenario_id uuid null,
context text null,
status public.turn_status null default 'selecting_category'::turn_status,
constraint turns_pkey primary key (id),
constraint unique_round_turn unique (round_id, turn_number),
constraint turns_decider_id_fkey foreign KEY (decider_id) references players (id) on delete CASCADE,
constraint turns_round_id_fkey foreign KEY (round_id) references rounds (id) on delete CASCADE,
constraint turns_scenario_id_fkey foreign KEY (scenario_id) references scenarios (id) on delete set null
) TABLESPACE pg_default;
create table public.votes (
id uuid not null default gen_random_uuid (),
answer_id uuid not null,
voter_id uuid not null,
created_at timestamp with time zone null default now(),
constraint votes_pkey primary key (id),
constraint votes_answer_id_voter_id_key unique (answer_id, voter_id),
constraint votes_answer_id_fkey foreign KEY (answer_id) references answers (id) on delete CASCADE,
constraint votes_voter_id_fkey foreign KEY (voter_id) references players (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger handle_vote_changes
after INSERT
or DELETE on votes for EACH row
execute FUNCTION update_answer_vote_points ();
