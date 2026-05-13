from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from groq import Groq
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="AI Agent API", version="1.0.0")

# CORS - allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://aria-agent-frontendd.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
# Set GROQ_API_KEY environment variable before running
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are ARIA (Advanced Reasoning and Intelligence Agent), a highly capable AI assistant. 
You are knowledgeable, thoughtful, and precise. You help users with a wide range of tasks including:
- Analysis and research
- Writing and editing
- Coding and debugging
- Math and reasoning
- Creative tasks

Always be clear, concise, and helpful. Format responses with markdown when appropriate."""

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "llama-3.3-70b-versatile"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    message: str
    model: str
    usage: dict

@app.get("/")
def root():
    return {"status": "ARIA Agent API is running", "version": "1.0.0"}

@app.get("/models")
def get_models():
    """Return available Groq models"""
    return {
        "models": [
            {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B", "description": "Most capable, best for complex tasks"},
            {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B Instant", "description": "Fast and efficient"},
            {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B", "description": "Great for long contexts"},
            {"id": "gemma2-9b-it", "name": "Gemma 2 9B", "description": "Google's efficient model"},
        ]
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Non-streaming chat endpoint"""
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages += [{"role": m.role, "content": m.content} for m in request.messages]

        completion = client.chat.completions.create(
            model=request.model,
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        return ChatResponse(
            message=completion.choices[0].message.content,
            model=completion.model,
            usage={
                "prompt_tokens": completion.usage.prompt_tokens,
                "completion_tokens": completion.usage.completion_tokens,
                "total_tokens": completion.usage.total_tokens,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint using Server-Sent Events"""
    def generate():
        try:
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            messages += [{"role": m.role, "content": m.content} for m in request.messages]

            stream = client.chat.completions.create(
                model=request.model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                stream=True,
            )

            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    data = json.dumps({"token": delta.content, "done": False})
                    yield f"data: {data}\n\n"

            yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

@app.delete("/chat/clear")
def clear_chat():
    """Endpoint to acknowledge chat clearing (state is client-side)"""
    return {"status": "cleared"}
