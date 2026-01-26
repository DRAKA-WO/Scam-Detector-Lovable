# Migration Safety Guidelines

## CRITICAL: Preventing Data Loss

### Before Creating Any Migration That Affects Data:

1. **ALWAYS check the current database state first**
   - Query the actual function/table to see what it currently does
   - Don't assume based on function names or old migrations
   - Use: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'function_name';`

2. **Verify migration order**
   - Check if a later migration already changed what you're modifying
   - Migration numbers indicate order: `20240101000015` runs AFTER `20240101000006`

3. **Test in development first**
   - Never apply data-deleting migrations directly to production
   - Test with sample data that mirrors production

4. **Add explicit comments**
   - Document what the code actually does, not what the name suggests
   - Add warnings for misleading names

### Known Misleading Names:

- `keep_latest_3_scans()` - **Actually keeps scans for 30 days, NOT 3 scans!**
  - The name is misleading but kept for backwards compatibility
  - DO NOT change this to limit by count
  - See migration `20240101000006` for the actual behavior

### Red Flags to Watch For:

- Function names that suggest a count but actually use time-based logic
- Migrations that recreate functions without checking current implementation
- Any DELETE statements without WHERE clauses limiting by time or user
- Migrations that drop and recreate tables (can lose data)

### Before Running Migrations in Production:

1. Backup the database
2. Review the migration SQL carefully
3. Check what the current state is
4. Test on a copy of production data
5. Have a rollback plan

### If You See Data Loss:

1. **STOP** - Don't run more migrations
2. Check database backups
3. Review migration history to find what changed
4. Restore from backup if possible
