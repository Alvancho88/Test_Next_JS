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

load_dotenv(dotenv_path=Path(__file__).parent.parent / '.env')

app = Flask(__name__)
CORS(app)

# Clients
groq_client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROQ_API_KEY"))
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel('gemini-3.1-flash-lite-preview')

def clean_to_number(value):
    if isinstance(value, (int, float)): return value
    cleaned = re.sub(r'[^\d.]', '', str(value))
    try: return float(cleaned) if '.' in cleaned else int(cleaned)
    except: return 0

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        user_text = request.form.get('userText', '')
        files = request.files.getlist('file')
        
        # OCR Stage
        combined_ocr_results = ""
        for file in files[:5]:
            image_base64 = base64.b64encode(file.read()).decode('utf-8')
            ocr_res = groq_client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": "List food/drink names from this menu exactly as written."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                ]}]
            )
            combined_ocr_results += ocr_res.choices[0].message.content + "\n"

        # ALL-IN-ONE Analysis Prompt
        prompt = f"""
        CONTEXT:
        Menu Text: {combined_ocr_results}
        Manual Input (comma separated): {user_text}

        TASK:
        1. Extract ALL items from the context.
        2. Categorize each item into: 'Appetizer', 'Main Dish', 'Dessert', or 'Drinks'.
        3. STRICT: Only use items mentioned in the context.
        4. For each: Estimate Sugar(g), Calories(kcal), GI Value(0-100), and GI Level.
        5. Provide a tip.

        Output ONLY JSON:
        {{
            "Appetizer": [],
            "Main Dish": [],
            "Dessert": [],
            "Drinks": []
        }}
        Each list item: {{"f": "name", "sugar": num, "c": num, "gi": "Low/Med/High", "gi_val": num, "tip": "string"}}
        """
        
        response = gemini_model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        raw_data = json.loads(response.text)
        
        # Sort each category once
        final_results = {}
        for cat in ["Appetizer", "Main Dish", "Dessert", "Drinks"]:
            items = raw_data.get(cat, [])
            for item in items:
                item['sugar'] = clean_to_number(item.get('sugar', 0))
                item['gi_val'] = clean_to_number(item.get('gi_val', 55))
            
            # GI first, then Sugar
            sorted_items = sorted(items, key=lambda x: (x['gi_val'], x['sugar']))
            final_results[cat] = {
                "recommended": sorted_items[0] if sorted_items else None,
                "ranking": sorted_items[:3]
            }

        return jsonify(final_results)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5328)