import json
import re
from fastapi.responses import JSONResponse
from beanie import Document


def _to_camel(snake: str) -> str:
    if snake.startswith('_'):   # preserve _id and any other _ prefixed keys
        return snake
    components = snake.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def _camel_keys(obj):
    """Recursively convert all dict keys from snake_case to camelCase."""
    if isinstance(obj, dict):
        return {_to_camel(k): _camel_keys(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_camel_keys(i) for i in obj]
    return obj


def serialize(doc: Document) -> dict:
    """Convert Beanie document → camelCase dict (frontend-compatible)."""
    raw = json.loads(doc.model_dump_json(by_alias=True))
    return _camel_keys(raw)


def serialize_list(docs: list) -> list:
    return [serialize(d) for d in docs]


def success(data=None, message: str = "Success", status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": True, "message": message, "data": data},
    )


def created(data=None, message: str = "Created") -> JSONResponse:
    return success(data, message, 201)
