ALTER TABLE pilot_shifts ADD COLUMN retired INTEGER NOT NULL DEFAULT 0;
UPDATE pilot_shifts SET retired=1 WHERE id IN (SELECT shift_id FROM pilot_archived_shifts);
DROP INDEX pilot_shifts_day_unique;
CREATE UNIQUE INDEX pilot_shifts_current_day ON pilot_shifts(day) WHERE retired=0;
CREATE TABLE pilot_resets (id TEXT PRIMARY KEY NOT NULL,shift_id TEXT NOT NULL REFERENCES pilot_shifts(id),actor TEXT NOT NULL REFERENCES pilot_accounts(id),created_at TEXT NOT NULL,reason TEXT NOT NULL,snapshot_json TEXT NOT NULL);
