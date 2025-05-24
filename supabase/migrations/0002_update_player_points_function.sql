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
$$ LANGUAGE plpgsql;
