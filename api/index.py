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

# Stage 1 Client (Groq - Llama Scout for OCR)
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
        # Handle multiple files (max 5)
        files = request.files.getlist('file')
        
        combined_ocr_results = ""
        for i, file in enumerate(files[:5]):
            image_base64 = base64.b64encode(file.read()).decode('utf-8')
            ocr_res = groq_client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": "List every food and drink item in this image."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                ]}]
            )
            combined_ocr_results += f"\n[Photo {i+1}]: " + ocr_res.choices[0].message.content

        # Combine with manual text
        final_input = f"Manual Input: {user_text}\nOCR Data: {combined_ocr_results}"

        prompt = f"""
        Analyze this Malaysian food data for a diabetic user:
        {final_input}
        
        Return ONLY a JSON array.
        Format: [{{"f": "name", "c": number, "ft": number, "gi": "Low/Med/High"}}]
        """
        
        response = gemini_model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        raw_data = json.loads(response.text)
        
        # Sanitize
        processed = []
        for item in raw_data:
            processed.append({
                "f": item.get("f", "Unknown Dish"),
                "c": clean_to_number(item.get("c", 0)),
                "ft": clean_to_number(item.get("ft", 0)),
                "gi": item.get("gi", "Med")
            })

        # Sorting Logic: GI (Low first), then Calories
        sorted_data = sorted(processed, key=lambda x: (x['gi'] != 'Low', x['gi'] == 'High', x['c']))
        
        return jsonify({
            "best": sorted_data[0] if sorted_data else None,
            "next_three": sorted_data[1:4],
            "all": processed
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5328)