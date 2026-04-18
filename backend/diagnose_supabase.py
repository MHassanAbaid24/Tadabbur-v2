import asyncio
try:
    from supabase import create_client, create_async_client
    import inspect
    
    print(f"create_client is coroutine function: {inspect.iscoroutinefunction(create_client)}")
    print(f"create_async_client is coroutine function: {inspect.iscoroutinefunction(create_async_client)}")
    
    from app.config import settings
    c = create_client(settings.supabase_url, settings.supabase_service_key)
    print(f"create_client result type: {type(c)}")
    if inspect.iscoroutine(c):
        print("ALERT: create_client returned a coroutine!")
        
    ac = create_async_client(settings.supabase_url, settings.supabase_service_key)
    print(f"create_async_client result type: {type(ac)}")
    if inspect.iscoroutine(ac):
        print("ALERT: create_async_client returned a coroutine!")
        
except Exception as e:
    print(f"Error: {e}")
