from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services import ai_chat
from app.utils.response import success
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatRequest(BaseModel):
    question: str


@router.post("/chat")
async def chat(body: ChatRequest, _=Depends(get_current_user)):
    answer = await ai_chat.answer(body.question)
    return success({"answer": answer})
