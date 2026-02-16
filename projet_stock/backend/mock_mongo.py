
import mongomock
from unittest.mock import MagicMock
import asyncio

class AsyncCursor:
    def __init__(self, cursor):
        self._cursor = cursor
        
    def sort(self, key_or_list, direction=None):
        self._cursor.sort(key_or_list, direction)
        return self
        
    def skip(self, n):
        self._cursor.skip(n)
        return self
        
    def limit(self, n):
        self._cursor.limit(n)
        return self
        
    def __aiter__(self):
        return self
        
    async def __anext__(self):
        # basic implementation of async iteration
        try:
            return next(self._cursor)
        except StopIteration:
            raise StopAsyncIteration

    async def to_list(self, length):
        # mongomock cursor is an iterator, needs converting strictly
        # It doesn't support slicing directly if it's exhausted?
        # Re-cloning? No, simple approach:
        return list(self._cursor)[:length] if length else list(self._cursor)

class AsyncCollection:
    def __init__(self, col):
        self._col = col
        
    async def find_one(self, filter=None, *args, **kwargs):
        # mongomock sync call
        return self._col.find_one(filter, *args, **kwargs)
        
    async def insert_one(self, document, *args, **kwargs):
        return self._col.insert_one(document, *args, **kwargs)
        
    def find(self, *args, **kwargs):
        cursor = self._col.find(*args, **kwargs)
        return AsyncCursor(cursor)
        
    async def update_one(self, filter, update, *args, **kwargs):
        return self._col.update_one(filter, update, *args, **kwargs)
        
    async def delete_one(self, filter, *args, **kwargs):
        return self._col.delete_one(filter, *args, **kwargs)
        
    async def count_documents(self, filter, *args, **kwargs):
        return self._col.count_documents(filter, *args, **kwargs)
        
    async def delete_many(self, filter, *args, **kwargs):
        return self._col.delete_many(filter, *args, **kwargs)

class AsyncDatabase:
    def __init__(self, db):
        self._db = db
        self.name = db.name
    
    def __getattr__(self, name):
        return AsyncCollection(getattr(self._db, name))
        
    def __getitem__(self, name):
        return AsyncCollection(self._db[name])
        
    async def command(self, command, *args, **kwargs):
        # Limited support for command "ping"
        if command == "ping":
            return {"ok": 1}
        return {}

class AsyncIOMotorClient:
    def __init__(self, *args, **kwargs):
        self._client = mongomock.MongoClient()
        
    def __getitem__(self, name):
        return AsyncDatabase(self._client[name])
    
    def close(self):
        self._client.close()
