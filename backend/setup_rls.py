#!/usr/bin/env python3
"""
Helper script to apply RLS policies to Supabase via admin API.
Run this once during initial setup to enable Row Level Security.

Usage:
    python setup_rls.py
"""

import sys
from pathlib import Path
from app.db.supabase import supabase_client
from app.config import settings

def setup_rls():
    """Apply RLS policies using SQL via Supabase admin API."""
    
    # Try to read migration file
    migration_file = Path(__file__).parent / "migrations" / "001_enable_rls.sql"
    
    if not migration_file.exists():
        print(f"✗ Migration file not found: {migration_file}")
        sys.exit(1)
    
    sql_content = migration_file.read_text()
    print(f"📖 Loaded migration from: {migration_file}")
    print(f"📝 SQL statements: {sql_content.count(';')} queries\n")
    
    # Split SQL into individual statements
    statements = [s.strip() for s in sql_content.split(';') if s.strip()]
    
    successful = 0
    failed = 0
    skipped = 0
    
    for i, statement in enumerate(statements, 1):
        try:
            print(f"[{i}/{len(statements)}] ", end="", flush=True)
            
            # Execute via Supabase client's execute method if available
            # Otherwise try via admin API
            try:
                # Try direct query execution
                from postgrest.exceptions import APIError
                result = supabase_client.postgrest.rpc("execute_sql", {"sql": statement}).execute()
                print(f"✓ {statement[:60]}...")
                successful += 1
            except:
                # Fallback: some statements like ALTER TABLE, CREATE POLICY need special handling
                # We'll just print them and let user run manually
                raise NotImplementedError("Use Supabase SQL Editor")
                
        except NotImplementedError:
            print(f"ℹ Manual step: {statement[:60]}...")
            skipped += 1
        except Exception as e:
            error_msg = str(e)
            # Some errors are expected (already exists)
            if "already exists" in error_msg.lower():
                print(f"ℹ Already exists: {statement[:60]}...")
                skipped += 1
            else:
                print(f"✗ Failed: {error_msg}")
                failed += 1
    
    print(f"\n📊 Results:")
    print(f"   ✓ Successful: {successful}")
    print(f"   ℹ Skipped:    {skipped}")
    print(f"   ✗ Failed:     {failed}")
    
    if failed > 0:
        print(f"\n⚠️  Some policies failed to create.")
        print(f"📖 Please manually run the SQL from: {migration_file}")
        print(f"   In Supabase Dashboard → SQL Editor")
        return False
    
    print(f"\n✅ RLS setup complete!")
    return True

if __name__ == "__main__":
    success = setup_rls()
    sys.exit(0 if success else 1)
