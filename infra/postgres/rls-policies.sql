-- Run after TypeORM has created the MVP schema. API requests must set
-- SET LOCAL app.tenant_id = '<organization uuid>' inside their transaction.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'employees','devices','refresh_sessions','rooms','room_members','messages',
    'documents','document_versions','audit_events','recovery_ceremonies','recovery_approvals'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      table_name
    );
  END LOOP;
END $$;
