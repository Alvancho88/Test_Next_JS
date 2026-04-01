import os
import base64
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from cerebras.cloud.sdk import Cerebras
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

app = Flask(__name__)
CORS(app)

groq_client = OpenAI(
    base_url="https://api.groq.com/openai/v1", 
    api_key=os.getenv("GROQ_API_KEY")
)
cerebras_client = Cerebras(api_key=os.getenv("CEREBRAS_API_KEY"))

def clean_to_number(value):
    """Helper to convert string like '20g' or '300' into a clean float/int."""
    if isinstance(value, (int, float)):
        return value
    # Remove all non-numeric characters except for the decimal point
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
            
        image_base64 = base64.b64encode(file.read()).decode('utf-8')

        # STAGE 1: OCR
        ocr_res = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": [
                {"type": "text", "text": "Extract food names and prices from this menu."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
            ]}]
        )
        menu_text = ocr_res.choices[0].message.content
        print(f"--- STAGE 1 OCR COMPLETE ---\n{menu_text}\n")

        # STAGE 2: Analysis
        analysis_res = cerebras_client.chat.completions.create(
            model="llama3.1-8b", 
            messages=[
                {"role": "system", "content": "You are a nutrition expert. Return ONLY a JSON array. Format: [{\"f\": \"name\", \"c\": number, \"ft\": number, \"gi\": \"Low/Med/High\"}]. Do not include units like 'g' or 'kcal' in the values, just the numbers."},
                {"role": "user", "content": menu_text}
            ]
        )
        
        raw_content = analysis_res.choices[0].message.content
        print(f"--- STAGE 2 RAW OUTPUT ---\n{raw_content}\n")

        # 1. Find the JSON brackets
        match = re.search(r'\[.*\]', raw_content, re.DOTALL)
        if not match:
            return jsonify({"error": "No valid JSON list found"}), 500
        
        json_string = match.group(0).replace("'", '"')
        
        # 2. Parse the list
        raw_data = json.loads(json_string)
        
        # 3. DATA SANITIZATION: Ensure 'c' and 'ft' are numbers for the Frontend
        final_data = []
        for item in raw_data:
            final_data.append({
                "f": item.get("f", "Unknown"),
                "c": clean_to_number(item.get("c", 0)),
                "ft": clean_to_number(item.get("ft", 0)),
                "gi": item.get("gi", "Med")
            })

        return jsonify(final_data)

    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")
        return jsonify({"error": "Data formatting error", "details": str(e)}), 500

def handler(app, request):
    return app(request)

if __name__ == '__main__':
    app.run(debug=True, port=5328)