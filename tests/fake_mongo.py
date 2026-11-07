"""Collection Mongo asynchrone minimale, en mémoire, pour les tests unitaires.

Elle ne couvre que les opérateurs utilisés par les modules testés ; tout opérateur
inconnu lève une erreur afin qu'un test ne passe jamais par accident.
"""

import copy
from types import SimpleNamespace

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

_MISSING = object()


def _get(doc, path):
    current = doc
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return _MISSING
        current = current[part]
    return current


def _matches_condition(value, condition):
    if isinstance(condition, dict) and condition and all(key.startswith("$") for key in condition):
        for op, expected in condition.items():
            if op == "$exists":
                if (value is not _MISSING) != bool(expected):
                    return False
            elif op == "$gt":
                if value is _MISSING or value is None or not value > expected:
                    return False
            elif op == "$gte":
                if value is _MISSING or value is None or not value >= expected:
                    return False
            elif op == "$lt":
                if value is _MISSING or value is None or not value < expected:
                    return False
            elif op == "$lte":
                if value is _MISSING or value is None or not value <= expected:
                    return False
            elif op == "$in":
                if value is _MISSING or value not in expected:
                    return False
            elif op == "$ne":
                if value is not _MISSING and value == expected:
                    return False
            else:
                raise NotImplementedError(op)
        return True
    return value is not _MISSING and value == condition


def matches(doc, query):
    for key, condition in query.items():
        if key == "$or":
            if not any(matches(doc, option) for option in condition):
                return False
        elif key == "$and":
            if not all(matches(doc, option) for option in condition):
                return False
        elif key.startswith("$"):
            raise NotImplementedError(key)
        elif not _matches_condition(_get(doc, key), condition):
            return False
    return True


def _apply_update(doc, update, inserting):
    for op, fields in update.items():
        if op == "$set":
            for key, value in fields.items():
                doc[key] = copy.deepcopy(value)
        elif op == "$setOnInsert":
            if inserting:
                for key, value in fields.items():
                    doc[key] = copy.deepcopy(value)
        elif op == "$unset":
            for key in fields:
                doc.pop(key, None)
        elif op == "$inc":
            for key, value in fields.items():
                doc[key] = doc.get(key, 0) + value
        else:
            raise NotImplementedError(op)


def _project(doc, projection):
    if doc is None:
        return None
    result = copy.deepcopy(doc)
    if not projection:
        return result
    included = {key for key, value in projection.items() if value and key != "_id"}
    if included or (len(projection) == 1 and projection.get("_id")):
        projected = {key: result[key] for key in included if key in result}
        if projection.get("_id", 1) and "_id" in result:
            projected["_id"] = result["_id"]
        return projected
    for key, value in projection.items():
        if not value:
            result.pop(key, None)
    return result


class FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, key, direction=1):
        self._docs.sort(key=lambda doc: doc.get(key), reverse=direction < 0)
        return self

    def limit(self, count):
        self._docs = self._docs[:count]
        return self

    async def to_list(self, length=None):
        return self._docs if length is None else self._docs[:length]


class FakeCollection:
    def __init__(self):
        self.docs = []
        self.unique_indexes = []

    def _find_index(self, query):
        for index, doc in enumerate(self.docs):
            if matches(doc, query):
                return index
        return None

    def _check_unique(self, candidate, ignore=None):
        for fields in [("_id",), *self.unique_indexes]:
            key = tuple(candidate.get(field, _MISSING) for field in fields)
            if _MISSING in key:
                continue
            for doc in self.docs:
                if doc is not ignore and tuple(doc.get(field, _MISSING) for field in fields) == key:
                    raise DuplicateKeyError(f"duplicate key {fields}")

    async def create_index(self, keys, unique=False, **_kwargs):
        if unique:
            fields = tuple(key for key, _direction in keys) if isinstance(keys, list) else (keys,)
            self.unique_indexes.append(fields)
        return "index"

    async def insert_one(self, doc):
        doc = copy.deepcopy(doc)
        self._check_unique(doc)
        self.docs.append(doc)
        return SimpleNamespace(inserted_id=doc.get("_id"))

    async def find_one(self, query, projection=None):
        index = self._find_index(query)
        return _project(self.docs[index], projection) if index is not None else None

    def find(self, query, projection=None):
        return FakeCursor([_project(doc, projection) for doc in self.docs if matches(doc, query)])

    async def update_one(self, query, update, upsert=False):
        index = self._find_index(query)
        if index is None:
            if not upsert:
                return SimpleNamespace(matched_count=0, modified_count=0, upserted_id=None)
            doc = {key: value for key, value in query.items() if not key.startswith("$") and not isinstance(value, dict)}
            _apply_update(doc, update, inserting=True)
            self._check_unique(doc)
            self.docs.append(doc)
            return SimpleNamespace(matched_count=0, modified_count=0, upserted_id=doc.get("_id"))
        before = copy.deepcopy(self.docs[index])
        candidate = copy.deepcopy(before)
        _apply_update(candidate, update, inserting=False)
        self._check_unique(candidate, ignore=self.docs[index])
        self.docs[index] = candidate
        return SimpleNamespace(matched_count=1, modified_count=int(candidate != before), upserted_id=None)

    async def find_one_and_update(self, query, update, return_document=ReturnDocument.BEFORE, projection=None):
        index = self._find_index(query)
        if index is None:
            return None
        before = copy.deepcopy(self.docs[index])
        candidate = copy.deepcopy(before)
        _apply_update(candidate, update, inserting=False)
        self._check_unique(candidate, ignore=self.docs[index])
        self.docs[index] = candidate
        return _project(candidate if return_document == ReturnDocument.AFTER else before, projection)


class FakeDatabase:
    def __init__(self):
        self._collections = {}

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._collections.setdefault(name, FakeCollection())
