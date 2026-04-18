import asyncio
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

class EventBus:
    """In-memory pub/sub for real-time SSE events."""

    def __init__(self):
        # Map: circle_id -> set of asyncio.Queue
        self._circle_subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)
        # Map: user_id -> set of asyncio.Queue  
        self._user_subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)

    def subscribe_circle(self, circle_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        self._circle_subscribers[circle_id].add(queue)
        return queue

    def unsubscribe_circle(self, circle_id: str, queue: asyncio.Queue):
        if circle_id in self._circle_subscribers:
            self._circle_subscribers[circle_id].discard(queue)
            if not self._circle_subscribers[circle_id]:
                del self._circle_subscribers[circle_id]

    def subscribe_user(self, user_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        self._user_subscribers[user_id].add(queue)
        return queue

    def unsubscribe_user(self, user_id: str, queue: asyncio.Queue):
        if user_id in self._user_subscribers:
            self._user_subscribers[user_id].discard(queue)
            if not self._user_subscribers[user_id]:
                del self._user_subscribers[user_id]

    async def publish_to_circle(self, circle_id: str, event: dict):
        if circle_id in self._circle_subscribers:
            # Create a copy of the set to avoid "Set size changed during iteration" errors
            # though asyncio.Queue.put is async, we can gather or loop
            tasks = []
            for queue in list(self._circle_subscribers[circle_id]):
                tasks.append(queue.put(event))
            if tasks:
                await asyncio.gather(*tasks)

    async def publish_to_user(self, user_id: str, event: dict):
        if user_id in self._user_subscribers:
            tasks = []
            for queue in list(self._user_subscribers[user_id]):
                tasks.append(queue.put(event))
            if tasks:
                await asyncio.gather(*tasks)

# Singleton instance
event_bus = EventBus()
