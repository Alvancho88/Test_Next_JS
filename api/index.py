import os
import base64
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

load_dotenv(dotenv_path=Path(__file__).parent.parent / '.env')

app = Flask(__name__)
CORS(app)

groq_client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROQ_API_KEY"))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel('gemini-3.1-flash-lite-preview')

def clean_to_number(value):
    if isinstance(value, (int, float)): return value
    cleaned = re.sub(r'[^\d.]', '', str(value))
    try: return float(cleaned) if '.' in cleaned else int(cleaned)
    except: return 0

def process_single_image(file_storage):
    try:
        image_base64 = base64.b64encode(file_storage.read()).decode('utf-8')
        res = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": [
                {"type": "text", "text": "List food/drink names exactly as written on this menu."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
            ]}]
        )
        return res.choices[0].message.content
    except: return ""

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        user_text = request.form.get('userText', '')
        files = request.files.getlist('file')
        
        with ThreadPoolExecutor() as executor:
            ocr_results = list(executor.map(process_single_image, files[:5]))
        
        combined_ocr = "\n".join(ocr_results)

        # REFINED PROMPT: Explicitly instructs to include Manual Input items
        prompt = f"""
        CONTEXT:
        Menu OCR: {combined_ocr}
        USER MANUAL INPUT: {user_text}

        TASK:
        1. Extract items from BOTH Menu OCR AND USER MANUAL INPUT. 
        2. Categorize: 'Appetizer', 'Main Dish', 'Dessert', 'Drinks'.
        3. For items like 'Air Putih' or 'Mineral Water', prioritize them in 'Drinks'.
        4. Estimate: Sugar(g), Calories(kcal), GI Value(0-100), and Risk (Low, Medium, High).
        5. Provide a tip for EVERY item.

        RANKING LOGIC:
        - Priority 1: Risk (Low > Med > High)
        - Priority 2: Sugar (Lowest first)
        - Priority 3: GI Value (Lowest first)
        - Priority 4 (TIE-BREAKER): Calories (Lowest first). 
          Example: If Lettuce and Gizzard have same Risk/Sugar/GI, Lettuce MUST rank higher because of lower calories.

        Output ONLY JSON:
        {{
            "Appetizer": [], "Main Dish": [], "Dessert": [], "Drinks": []
        }}
        Item: {{"f": "name", "sugar": num, "c": num, "gi_val": num, "risk": "string", "tip": "string"}}
        """
        
        response = gemini_model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        raw_data = json.loads(response.text)
        
        final_results = {}
        risk_map = {"Low": 1, "Medium": 2, "High": 3}

        for cat in ["Appetizer", "Main Dish", "Dessert", "Drinks"]:
            items = raw_data.get(cat, [])
            for item in items:
                item['sugar'] = clean_to_number(item.get('sugar', 0))
                item['gi_val'] = clean_to_number(item.get('gi_val', 55))
                item['c'] = clean_to_number(item.get('c', 0))
                item['risk_score'] = risk_map.get(item.get('risk', 'Medium'), 2)
            
            # Python-side sorting to enforce the tie-breaker
            sorted_items = sorted(items, key=lambda x: (
                x['risk_score'], 
                x['sugar'], 
                x['gi_val'], 
                x['c']
            ))
            
            for s_item in sorted_items: s_item.pop('risk_score', None)
            final_results[cat] = {"ranking": sorted_items}

        return jsonify(final_results)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5328)