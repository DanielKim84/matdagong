DELETE FROM user_recent_places
WHERE viewed_at < now() - INTERVAL '15 days';
