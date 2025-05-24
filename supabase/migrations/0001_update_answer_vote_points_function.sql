CREATE OR REPLACE FUNCTION update_answer_vote_points() RETURNS TRIGGER AS $$
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
END;
$$ LANGUAGE plpgsql;
