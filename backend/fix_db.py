import asyncio
from app.db.supabase import supabase_client

async def main():
    # Fetch all circles
    circles = supabase_client.table("circles").select("id, created_by").execute()
    for c in circles.data:
        # Update creator to be admin
        supabase_client.table("circle_members").update({"is_admin": True}).eq("circle_id", c["id"]).eq("user_id", c["created_by"]).execute()
    print("Updated creators to admins.")

asyncio.run(main())
