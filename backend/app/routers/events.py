import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse

from app.auth.jwt import get_current_user
from app.db.supabase import supabase_client
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/stream")
async def event_stream(authorization: str = Header(...)):
    """
    Server-Sent Events (SSE) endpoint to stream real-time updates.
    """
    try:
        current_user = await get_current_user(authorization)
    except Exception as e:
        logger.error("SSE Auth failed: %s", str(e))
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    user_id = current_user["sub"]

    # Find user's circle_id (if any) to subscribe to group events
    membership = await asyncio.to_thread(
        lambda: supabase_client.table("circle_members")
        .select("circle_id").eq("user_id", user_id).execute()
    )
    circle_id = membership.data[0]["circle_id"] if membership.data else None

    async def generate():
        circle_queue = None
        user_queue = event_bus.subscribe_user(user_id)

        if circle_id:
            circle_queue = event_bus.subscribe_circle(circle_id)

        logger.info(f"User {user_id} connected to SSE (Circle: {circle_id})")

        try:
            # Send initial connection signal
            yield f"data: {json.dumps({'type': 'connected'})}\n\n"

            while True:
                tasks = [asyncio.ensure_future(user_queue.get())]
                if circle_queue:
                    tasks.append(asyncio.ensure_future(circle_queue.get()))

                # Heartbeat to keep connection alive (30s)
                heartbeat_task = asyncio.ensure_future(asyncio.sleep(30))
                tasks.append(heartbeat_task)

                # Wait for any of the tasks to complete
                done, pending = await asyncio.wait(
                    tasks, return_when=asyncio.FIRST_COMPLETED
                )

                # Cancel remaining tasks
                for task in pending:
                    task.cancel()

                for task in done:
                    # If it was the heartbeat, just send a signal
                    if task == heartbeat_task:
                        yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                    else:
                        # It was an actual event
                        event = task.result()
                        yield f"data: {json.dumps(event)}\n\n"

        except asyncio.CancelledError:
            logger.info(f"User {user_id} SSE connection closed (cancelled)")
        except Exception as e:
            logger.error(f"SSE stream error for user {user_id}: {str(e)}")
        finally:
            event_bus.unsubscribe_user(user_id, user_queue)
            if circle_queue and circle_id:
                event_bus.unsubscribe_circle(circle_id, circle_queue)
            logger.info(f"User {user_id} unsubscribed from SSE")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Necessary for Nginx proxying
        },
    )
