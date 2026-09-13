import base64, json, os
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI

app = FastAPI(title="Kitchen KingAI API", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-20b:free")
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=API_KEY) if API_KEY else None

class RecipeRequest(BaseModel):
    ingredients: List[str] = Field(default_factory=list)
    request: str = ""
    servings: int = 2
    max_minutes: int = 60
    preferences: dict = Field(default_factory=dict)

class ChatRequest(BaseModel):
    message: str
    context: dict = Field(default_factory=dict)

class NutritionRequest(BaseModel):
    recipe: dict

class ShoppingRequest(BaseModel):
    recipe: dict
    pantry: List[str] = Field(default_factory=list)

RECIPE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "minutes": {"type": "integer"},
        "servings": {"type": "integer"},
        "ingredients": {"type": "array", "items": {"type": "string"}},
        "steps": {"type": "array", "items": {"type": "string"}},
        "nutrition": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "calories": {"type": "number"}, "protein_g": {"type": "number"},
                "carbs_g": {"type": "number"}, "fat_g": {"type": "number"}, "fiber_g": {"type": "number"}
            }, "required": ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"]
        },
        "tips": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["title", "description", "minutes", "servings", "ingredients", "steps", "nutrition", "tips"]
}

def ai_json(system: str, user: str, schema=None):
    if not client:
        raise HTTPException(503, "OpenRouter key is not configured. Add OPENROUTER_API_KEY to .env and restart Docker.")
    try:
        kwargs = dict(model=MODEL, messages=[{"role":"system","content":system},{"role":"user","content":user}], temperature=0.7)
        if schema:
            kwargs["response_format"] = {"type":"json_schema", "json_schema":{"name":"kitchen_kingai_recipe","strict":True,"schema":schema}}
        else:
            kwargs["response_format"] = {"type":"json_object"}
        r = client.chat.completions.create(**kwargs)
        content = r.choices[0].message.content or "{}"
        return json.loads(content)
    except Exception as e:
        raise HTTPException(502, f"AI provider error: {str(e)[:400]}")

@app.get("/health")
def health():
    return {"status":"ok","service":"Kitchen KingAI","ai_configured":bool(client),"model":MODEL}

@app.post("/api/recipes/generate")
def generate(req: RecipeRequest):
    request = req.request.strip() or "Create a delicious dinner using the available ingredients."
    system = """You are Kitchen KingAI, an expert personal chef. Generate a genuinely new recipe for the user's exact request. The user may ask for ANY reasonable meal, cuisine, style, ingredients, time, servings, budget, equipment, or cooking goal. Do not choose from a fixed recipe list and do not mention that recipes are hard-coded. Respect pantry ingredients when supplied, but if the user's request explicitly asks for ingredients not in the pantry, you may include them and make the missing items clear. Never claim an ingredient is available unless supplied. Respect dietary preferences and allergies. Avoid unsafe food handling and dangerous instructions. Keep the recipe practical for a home kitchen. Nutrition values are estimates. Return ONLY the requested JSON structure."""
    payload = {
        "user_request": request,
        "available_pantry": req.ingredients,
        "requested_servings": max(1, min(req.servings, 20)),
        "time_limit_minutes": max(5, min(req.max_minutes, 360)),
        "preferences": req.preferences,
        "instruction": "Use the user's natural-language request as the primary goal. If it conflicts with the pantry, satisfy the request and list any additional ingredients needed."
    }
    return ai_json(system, json.dumps(payload, ensure_ascii=False), RECIPE_SCHEMA)

@app.post("/api/chat")
def chat(req: ChatRequest):
    system = "You are Kitchen KingAI, a friendly cooking assistant. Answer the user's cooking question directly. Use the supplied recipe, pantry and preferences when relevant. If the user asks for a new meal, suggest or generate an appropriate idea. Never claim medical certainty. Return JSON with reply and suggested_actions (array of strings)."
    return ai_json(system, json.dumps(req.model_dump(), ensure_ascii=False))

@app.post("/api/nutrition")
def nutrition(req: NutritionRequest):
    system = "Estimate nutrition for a recipe. Return JSON with calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg and note. Values are estimates, not medical advice."
    return ai_json(system, json.dumps(req.recipe, ensure_ascii=False))

@app.post("/api/shopping")
def shopping(req: ShoppingRequest):
    system = "Create a practical shopping list from a recipe and pantry. Return JSON with items array; each item has name, quantity, unit, reason. Exclude ingredients clearly available in the pantry."
    return ai_json(system, json.dumps(req.model_dump(), ensure_ascii=False))

@app.post("/api/scanner")
async def scanner(file: UploadFile = File(...)):
    if not client:
        raise HTTPException(503, "OpenRouter key is not configured.")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Please upload an image file.")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "Image is larger than 8 MB.")
    b64 = base64.b64encode(data).decode()
    try:
        r = client.chat.completions.create(
            model="openrouter/free",
            messages=[{"role":"user","content":[
                {"type":"text","text":"Identify visible food ingredients. Return ONLY JSON: {\"ingredients\":[{\"name\":string,\"confidence\":number,\"notes\":string}]}. Do not identify people."},
                {"type":"image_url","image_url":{"url":f"data:{file.content_type};base64,{b64}"}}
            ]}], response_format={"type":"json_object"}
        )
        return json.loads(r.choices[0].message.content)
    except Exception as e:
        raise HTTPException(502, f"Vision provider error: {str(e)[:300]}")
