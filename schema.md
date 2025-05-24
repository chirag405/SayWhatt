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
) TABLESPACE pg_default;
create table public.scenarios (
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

DECLARE
expired_room_id uuid;
expired_rooms_cursor CURSOR FOR
SELECT id FROM public.rooms
WHERE expires_at <= NOW();
BEGIN
-- Open cursor to loop through expired rooms
OPEN expired_rooms_cursor;

    -- Loop through all expired rooms
    LOOP
        -- Get the next expired room
        FETCH expired_rooms_cursor INTO expired_room_id;

        -- Exit loop if no more expired rooms
        EXIT WHEN NOT FOUND;

        -- Delete the room (cascade will handle related data)
        DELETE FROM public.rooms WHERE id = expired_room_id;
    END LOOP;

    -- Close the cursor
    CLOSE expired_rooms_cursor;

END;

BEGIN
-- Delete any votes by this player
DELETE FROM votes WHERE voter_id = OLD.id;

-- Delete any answers by this player
DELETE FROM answers WHERE player_id = OLD.id;

-- Delete decider history for this player
DELETE FROM decider_history WHERE player_id = OLD.id;

RETURN NULL;
END;
DECLARE
player_room_id UUID;
is_player_decider BOOLEAN := FALSE;
current_round_id UUID;
current_round_num INTEGER;
current_turn_num INTEGER;
current_turn_id UUID;
next_decider_id UUID;
remaining_players INTEGER;
total_player_count INTEGER;
BEGIN
-- Get the room ID for the deleted player
player_room_id := OLD.room_id;
RAISE NOTICE 'Player room ID: %', player_room_id;

    -- Get current round info
    SELECT id, round_number, current_turn INTO current_round_id, current_round_num, current_turn_num
    FROM rounds
    WHERE room_id = player_room_id AND is_complete = FALSE
    LIMIT 1;

    RAISE NOTICE 'Current round ID: %, round number: %, current turn number: %', current_round_id, current_round_num, current_turn_num;

    -- If no active round, nothing to update
    IF current_round_id IS NULL THEN
        RAISE NOTICE 'No active round found. Exiting.';
        RETURN OLD;
    END IF;

    -- Count remaining players in the room
    SELECT COUNT(*) INTO remaining_players
    FROM players
    WHERE room_id = player_room_id;

    RAISE NOTICE 'Remaining players in room: %', remaining_players;

    -- If only one player is left, end the game immediately
    IF remaining_players = 1 THEN
        RAISE NOTICE 'Only one player left. Ending game.';
        UPDATE rooms
        SET game_status = 'completed',
            updated_at = NOW()
        WHERE id = player_room_id;

        RETURN OLD;
    END IF;

    -- Update the room's total_rounds based on the number of players
    UPDATE rooms
    SET total_rounds = GREATEST(1, total_rounds * remaining_players / (remaining_players + 1))
    WHERE id = player_room_id;

    RAISE NOTICE 'Updated total_rounds for room %', player_room_id;

    -- Check if the deleted player is the current decider
    SELECT t.id, (t.decider_id = OLD.id) INTO current_turn_id, is_player_decider
    FROM turns t
    WHERE t.round_id = current_round_id AND t.turn_number = current_turn_num;

    RAISE NOTICE 'Current turn ID: %, is deleted player the decider: %', current_turn_id, is_player_decider;

    -- Update remaining_deciders in the round
    UPDATE rounds
    SET remaining_deciders = remaining_players
    WHERE id = current_round_id AND remaining_deciders > remaining_players;

    RAISE NOTICE 'Updated remaining_deciders for round %', current_round_id;

    -- If the deleted player was the current decider, select a new one
    IF is_player_decider THEN
        RAISE NOTICE 'Deleted player was decider. Selecting new decider...';

        -- Find a new decider
        SELECT p.id INTO next_decider_id
        FROM players p
        WHERE p.room_id = player_room_id
        AND NOT EXISTS (
            SELECT 1 FROM decider_history dh
            WHERE dh.round_id = current_round_id AND dh.player_id = p.id
        )
        ORDER BY p.created_at
        LIMIT 1;

        RAISE NOTICE 'Next decider ID: %', next_decider_id;

        -- If no new decider, start voting phase
        IF next_decider_id IS NULL THEN
            RAISE NOTICE 'All players have been deciders. Marking round complete and starting voting phase.';

            UPDATE rounds
            SET status = 'voting', is_complete = TRUE
            WHERE id = current_round_id;

            UPDATE rooms
            SET round_voting_phase = TRUE
            WHERE id = player_room_id;

            RETURN OLD;
        END IF;

        -- Optionally update the turn with the new decider here
        -- (Only if you intend to assign the new decider now)
        -- UPDATE turns SET decider_id = next_decider_id WHERE id = current_turn_id;
    END IF;

    RAISE NOTICE 'Function execution complete.';
    RETURN OLD;

END;
BEGIN
UPDATE public.game_statistics
SET players_participated = players_participated + 1,
last_updated = now()
WHERE id = (SELECT id FROM public.game_statistics LIMIT 1);
RETURN NEW;
END;

BEGIN
UPDATE public.game_statistics
SET rooms_created = rooms_created + 1,
last_updated = now()
WHERE id = (SELECT id FROM public.game_statistics LIMIT 1);
RETURN NEW;
END;

DECLARE
new_host_id UUID;
room_id_val UUID;
BEGIN
-- Only proceed if the deleted player was a host
IF OLD.is_host THEN
room_id_val := OLD.room_id;

    -- Find a new host
    SELECT id INTO new_host_id FROM players
    WHERE room_id = room_id_val
    ORDER BY created_at ASC
    LIMIT 1;

    -- If there's another player, make them host
    IF new_host_id IS NOT NULL THEN
      UPDATE players SET is_host = true WHERE id = new_host_id;
      UPDATE rooms SET host_id = new_host_id WHERE id = room_id_val;
    END IF;

END IF;

RETURN NULL;
END;
DECLARE
player_room_id UUID;
current_round_id UUID;
BEGIN
-- Get the room ID for the deleted player
player_room_id := OLD.room_id;

    -- Get current round id
    SELECT id INTO current_round_id
    FROM rounds
    WHERE room_id = player_room_id AND is_complete = FALSE
    LIMIT 1;

    -- Skip if no active round
    IF current_round_id IS NULL THEN
        RETURN OLD;
    END IF;

    -- Delete any future turns where the deleted player was supposed to be the decider
    DELETE FROM turns
    WHERE round_id = current_round_id
    AND decider_id = OLD.id
    AND status = 'selecting_category'
    AND turn_number > (SELECT current_turn FROM rounds WHERE id = current_round_id);

    -- Renumber the remaining turns to ensure sequence continuity
    WITH turn_numbers AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY turn_number) AS new_turn_number
        FROM turns
        WHERE round_id = current_round_id
        AND turn_number > (SELECT current_turn FROM rounds WHERE id = current_round_id)
    )
    UPDATE turns t
    SET turn_number = tn.new_turn_number + (SELECT current_turn FROM rounds WHERE id = current_round_id)
    FROM turn_numbers tn
    WHERE t.id = tn.id;

    -- Update max turn count in the room based on remaining players
    UPDATE rounds
    SET remaining_deciders = (
        SELECT COUNT(*)
        FROM players
        WHERE room_id = player_room_id AND
        NOT EXISTS (
            SELECT 1 FROM decider_history
            WHERE round_id = current_round_id AND player_id = players.id
        )
    )
    WHERE id = current_round_id;

    RETURN OLD;

END;
BEGIN
-- If room status changed to 'completed', schedule deletion after 2 minutes
IF NEW.game_status = 'completed' AND (OLD.game_status IS NULL OR OLD.game_status <> 'completed') THEN
-- Schedule deletion for 2 minutes after completion
NEW.expires_at = NOW() + INTERVAL '2 minutes';
END IF;

    RETURN NEW;

END;

BEGIN
IF TG_OP = 'INSERT' THEN
-- Increment vote_points for the answer
UPDATE public.answers
SET vote_points = COALESCE(vote_points, 0) + 1
WHERE id = NEW.answer_id;

    -- Increment total_points for the player who wrote the answer
    -- This assumes that answers.player_id correctly references the player who authored the answer.
    UPDATE public.players
    SET total_points = COALESCE(total_points, 0) + 1
    FROM public.answers
    WHERE public.answers.id = NEW.answer_id AND public.players.id = public.answers.player_id;

ELSIF TG_OP = 'DELETE' THEN
-- Decrement vote_points for the answer
UPDATE public.answers
SET vote_points = COALESCE(vote_points, 0) - 1
WHERE id = OLD.answer_id;

    -- Decrement total_points for the player who wrote the answer
    -- This assumes that answers.player_id correctly references the player who authored the answer.
    UPDATE public.players
    SET total_points = COALESCE(total_points, 0) - 1
    FROM public.answers
    WHERE public.answers.id = OLD.answer_id AND public.players.id = public.answers.player_id;

END IF;
RETURN NULL; -- For AFTER triggers, the return value is ignored.
CREATE OR REPLACE FUNCTION update_player_points() RETURNS TRIGGER AS $$
BEGIN
IF TG_OP = 'INSERT' OR
(TG_OP = 'UPDATE' AND NEW.ai_points IS NOT NULL AND
(OLD.ai_points IS NULL OR NEW.ai_points != OLD.ai_points)) THEN

    UPDATE public.players
    SET total_points = COALESCE(total_points, 0) + COALESCE(NEW.ai_points, 0)
    WHERE id = NEW.player_id;

END IF;
RETURN NULL;
END;

$$
LANGUAGE plpgsql;
$$
