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

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

app = Flask(__name__)
CORS(app)

# Stage 1 Client (Groq - Llama 4 Scout)
groq_client = OpenAI(
    base_url="https://api.groq.com/openai/v1", 
    api_key=os.getenv("GROQ_API_KEY")
)

# Stage 2 Client (Gemini 3.1 Flash-Lite)
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
        category = request.form.get('category', 'Main Dish')
        files = request.files.getlist('file')
        
        combined_ocr_results = ""
        for i, file in enumerate(files[:5]):
            image_base64 = base64.b64encode(file.read()).decode('utf-8')
            ocr_res = groq_client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": f"Extract all food and drink names from this menu image."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                ]}]
            )
            combined_ocr_results += f"\n[Photo {i+1}]: " + ocr_res.choices[0].message.content

        final_input = f"Category Context: {category}\nManual Input: {user_text}\nOCR Context: {combined_ocr_results}"

        prompt = f"""
        Analyze the following Malaysian food data for the category: {category}.
        
        Instructions:
        1. Identify 5 items that fit the category '{category}'.
        2. Estimate Calories (c), Sugar in grams (sugar), and GI Index (gi_val as 0-100).
        3. Determine GI level (Low/Med/High).
        4. Provide an 'encouragement' tip for each.
        
        Return ONLY a JSON array.
        Format: [{{"f": "string", "sugar": number, "c": number, "gi": "string", "gi_val": number, "tip": "string"}}]
        """
        
        response = gemini_model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        raw_data = json.loads(response.text)
        
        processed = []
        for item in raw_data:
            processed.append({
                "f": item.get("f", "Unknown"),
                "sugar": clean_to_number(item.get("sugar", 0)),
                "c": clean_to_number(item.get("c", 0)),
                "gi": item.get("gi", "Med"),
                "gi_val": clean_to_number(item.get("gi_val", 55)),
                "tip": item.get("tip", "Better choice for health.")
            })

        # RANKING LOGIC: 
        # 1. GI Value (Lowest first)
        # 2. Sugar content (Lowest first - used if GI levels are the same)
        sorted_data = sorted(processed, key=lambda x: (x['gi_val'], x['sugar']))
        
        return jsonify({
            "recommended": sorted_data[0] if sorted_data else None,
            "ranking": sorted_data[:3],
            "category": category
        })

    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5328)