-- Realtime change feed (Oct 14, 2026). Additive only: one function and one
-- trigger per table. No table, column or enum is created, altered or dropped.
--
-- Every INSERT/UPDATE/DELETE sends a tiny `pg_notify` on the channel
-- `learniee_changes` carrying only the table name and, when the row has them,
-- the owning parent / teacher / recipient id. Postgres delivers a NOTIFY only
-- when the surrounding transaction COMMITS, so listeners never see a change
-- that was rolled back or is not yet readable. Identical payloads inside one
-- transaction are collapsed into one notification.
--
-- The app's `/api/realtime` stream (src/app/api/realtime/route.ts) LISTENs on
-- that channel and tells open browser tabs which screens to refetch.
--
-- NOTE: a table created by a LATER migration needs the same trigger, e.g.
--   CREATE TRIGGER "learniee_realtime_notify"
--     AFTER INSERT OR UPDATE OR DELETE ON "NewTable"
--     FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
-- and an entry in src/lib/realtime/resourceMap.ts.

CREATE OR REPLACE FUNCTION "learniee_notify_change"() RETURNS trigger AS $$
DECLARE
  rec          jsonb;
  parent_id    text;
  teacher_id   text;
  recipient_id text;
  room         RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := to_jsonb(OLD);
  ELSE
    rec := to_jsonb(NEW);
  END IF;

  parent_id    := rec->>'parentId';
  teacher_id   := rec->>'teacherId';
  recipient_id := rec->>'recipientId';

  -- A parent's / teacher's own profile row is keyed by `id`.
  IF TG_TABLE_NAME = 'ParentProfile' THEN
    parent_id := rec->>'id';
  END IF;

  -- Chat messages carry no owner columns; borrow them from the room.
  IF TG_TABLE_NAME = 'ChatMessage' THEN
    SELECT "parentId", "teacherId" INTO room
      FROM "ChatRoom" WHERE "id" = rec->>'chatRoomId';

    IF FOUND THEN
      parent_id  := room."parentId";
      teacher_id := room."teacherId";
    END IF;
  END IF;

  PERFORM pg_notify(
    'learniee_changes',
    jsonb_strip_nulls(jsonb_build_object(
      't', TG_TABLE_NAME,
      'p', parent_id,
      'e', teacher_id,
      'r', recipient_id
    ))::text
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS "learniee_realtime_notify" ON %I', tbl.tablename);
    EXECUTE format(
      'CREATE TRIGGER "learniee_realtime_notify" AFTER INSERT OR UPDATE OR DELETE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"()',
      tbl.tablename
    );
  END LOOP;
END $$;
