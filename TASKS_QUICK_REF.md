# Quick Task Reference

## 🚀 Quick Commands

```bash
# Show help
npm run task

# Clear S3 only
npm run task clear:s3

# Clear database only (keeps schema)
npm run task clear:db

# Clear everything (S3 + DB data)
npm run task clear:all

# Reinstall database schema
npm run task reinstall:db

# ⚠️ NUCLEAR: Clear everything and reinstall
npm run task clear:data:all
```

## 📋 What Each Command Does

| Command | S3 | DB Data | DB Schema |
|---------|----|---------| --------- |
| `clear:s3` | ✅ Deletes all files | ❌ Keeps | ❌ Keeps |
| `clear:db` | ❌ Keeps | ✅ Deletes all rows | ✅ Keeps structure |
| `clear:all` | ✅ Deletes all files | ✅ Deletes all rows | ✅ Keeps structure |
| `reinstall:db` | ❌ Keeps | ✅ Drops tables | ✅ Reinstalls fresh |
| `clear:data:all` | ✅ Deletes all files | ✅ Drops tables | ✅ Reinstalls fresh |

## ⚠️ Warning

**ALL OPERATIONS ARE IRREVERSIBLE!** 

Always backup before running in production.
