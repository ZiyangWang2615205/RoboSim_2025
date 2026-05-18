-- Change publish_runs default to TRUE so new algorithm clients
-- algorithms that run should then show on leaderboard
ALTER TABLE ACReg ALTER COLUMN publish_runs SET DEFAULT TRUE;

UPDATE ACReg SET publish_runs = TRUE WHERE publish_runs = FALSE;
