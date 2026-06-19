from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.rag import ask

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    username: str
    message : str
    
class MessageResponse(BaseModel):
    username: str
    message: str
    bot_reply: str | None = None
    
@app.get("/health")
def health():
    return{"status":"ok"}

@app.post("/chat", response_model = MessageResponse)
def chat(request: MessageRequest):
    bot_reply = None
    if "@Taz" in request.message or "@taz" in request.message:
        question = request.message.replace("@Taz", "").replace("@taz", "").strip()
        if question:
            bot_reply = ask(question)
        else:
            bot_reply = "You tagged me but didn't ask anything! Try: @Taz What is DEAP?"
        return MessageResponse(
        username=request.username,
        message=request.message,
        bot_reply=bot_reply
    )


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)