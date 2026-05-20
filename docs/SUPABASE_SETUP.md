# Supabase Setup Guide

## Issue
Registration fails with 422 error because Supabase Row Level Security (RLS) policies are not configured. Without RLS policies, the database rejects all INSERT/UPDATE/SELECT operations from the backend API.

## Solution: Run RLS Policies

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `Tadabbur`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Run Migrations
Copy the entire contents of `backend/migrations/001_master_schema.sql` and paste it into the SQL Editor, then click **Run** to set up the tables and primary RLS policies.

Next, copy the contents of `backend/migrations/002_fix_rls_policies.sql` and run them to update the security policies to their latest production state.

### Step 3: Verify
After running the migration, you should see:
- ✓ "RLS enabled on X tables"
- ✓ Multiple policy creation messages

### Step 4: Test Registration
Once policies are applied, try registering again:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "username": "myusername",
    "display_name": "My Name"
  }'
```

### What These Policies Do

**Profiles Table:**
- Users can insert their own profile
- Users can view their own profile
- Users can update their own profile
- Backend (service_role) can do anything

**Circles & Reflections:**
- Users can only view/modify their own data
- Users can join circles they're invited to
- Backend can admin all operations

**Daily Verse Log:**
- Public read access (all users can see)
- Backend write access

## Troubleshooting

### "Policy already exists" error
If you see this error, it means policies were already created. That's fine - registration should work now.

### Still getting 422 error
1. Clear browser cache
2. Restart backend: `Ctrl+C` in terminal, then `uvicorn main:app --reload`
3. Try registration again with fresh email

### Email confirmation not working
Separate issue - Supabase email provider needs configuration:
1. Dashboard → Authentication → Email
2. Set up email provider (SendGrid, Resend, or custom SMTP)
3. Users will then receive confirmation emails

---

Once RLS policies are configured, the entire auth flow will work:
1. User registers → Auth user created → Profile created → JWT issued ✓
2. User receives confirmation email → Clicks link → Account verified ✓
