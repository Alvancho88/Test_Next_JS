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

# Stage 1 Client (Groq)
groq_client = OpenAI(
    base_url="https://api.groq.com/openai/v1", 
    api_key=os.getenv("GROQ_API_KEY")
)

# Stage 2 Client (Gemini)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# Using Gemini 3 Flash for fast, efficient analysis
gemini_model = genai.GenerativeModel('gemini-3.1-flash-lite-preview')

def clean_to_number(value):
    """Helper to convert string like '20g' or '300' into a clean float/int."""
    if isinstance(value, (int, float)):
        return value
    cleaned = re.sub(r'[^\d.]', '', str(value))
    try:
        return float(cleaned) if '.' in cleaned else int(cleaned)
    except ValueError:
        return 0

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({"error": "No file uploaded"}), 400
            
        image_bytes = file.read()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')

        # STAGE 1: OCR (Llama 4 Scout on Groq)
        # --------------------------------------------------
        ocr_res = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": [
                {"type": "text", "text": "Extract all food names and prices from this menu. Be precise."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
            ]}]
        )
        menu_text = ocr_res.choices[0].message.content
        print(f"--- STAGE 1 OCR COMPLETE ---\n{menu_text}\n")

        # STAGE 2: Analysis (Gemini 3 Flash)
        # --------------------------------------------------
        prompt = f"""
        You are a Malaysian nutrition expert. Analyze the following menu text and provide nutritional estimates.
        Return ONLY a JSON array. 
        Format: [{{"f": "name", "c": number, "ft": number, "gi": "Low/Med/High"}}]
        
        Menu Text:
        {menu_text}
        """
        
        # Gemini often supports 'response_mime_type': 'application/json' for strictness
        response = gemini_model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        raw_content = response.text
        print(f"--- STAGE 2 RAW OUTPUT ---\n{raw_content}\n")

        # 1. Parse the JSON (Gemini with 'application/json' is usually very clean)
        raw_data = json.loads(raw_content)
        
        # 2. DATA SANITIZATION
        final_data = []
        # Ensure raw_data is a list
        items = raw_data if isinstance(raw_data, list) else []
        
        for item in items:
            final_data.append({
                "f": item.get("f", "Unknown Dish"),
                "c": clean_to_number(item.get("c", 0)),
                "ft": clean_to_number(item.get("ft", 0)),
                "gi": item.get("gi", "Med")
            })

        return jsonify(final_data)

    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")
        return jsonify({"error": "Gemini Analysis failed", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5328)