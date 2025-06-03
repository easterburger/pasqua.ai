import os
import json
from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

import io
import PyPDF2

app = Flask(__name__)

import markdown # For Study Guide

# Configure Gemini API
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in .env file. AI features will not work.")
    # You could raise an error or have a fallback, but for now, we'll let it try and fail.
else:
    genai.configure(api_key=api_key)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat_api():
    if not api_key:
        return jsonify({'error': 'API key not configured on server.'}), 500

    try:
        data = request.get_json()
        user_message = data.get('message')

        if not user_message:
            return jsonify({'error': 'No message provided.'}), 400

        model = genai.GenerativeModel('gemini-1.5-flash-latest') # Or your preferred model

        # For a simple chat, just send the message.
        # For conversational history, you'd need to manage chat sessions.
        # response = model.generate_content(user_message)

        # Start a chat session if you want to maintain conversation history
        # For now, let's assume each message is independent for simplicity in this step
        # If you want to build history:
        # chat_session = model.start_chat(history=[]) # manage history appropriately
        # response = chat_session.send_message(user_message)

        response = model.generate_content(user_message)

        if response and response.candidates and response.candidates[0].content.parts:
            ai_text = "".join(part.text for part in response.candidates[0].content.parts)
        else:
            # Fallback if the structure is not as expected or response is empty
            ai_text = "Sorry, I couldn't get a proper response."

        return jsonify({'reply': ai_text})

    except Exception as e:
        print(f"Error in /api/chat: {e}")
        # Check for specific API errors if possible, e.g., authentication, quota
        # More robust error checking can be added here based on Gemini API's specific exceptions
        if hasattr(e, 'args') and e.args:
            error_message = str(e.args[0]) if e.args else str(e)
            if "API_KEY_INVALID" in error_message or "API_KEY_MISSING" in error_message or "PERMISSION_DENIED" in error_message:
                 return jsonify({'error': f'Gemini API Key is invalid, missing, or lacks permissions. Please check server .env. Details: {error_message}'}), 500
        return jsonify({'error': f'An error occurred with the AI service: {e}'}), 500

@app.route('/flashcards')
def flashcards_page():
    return render_template('flashcards.html')

@app.route('/quiz-generator')
def quiz_generator_page():
    return render_template('quiz_generator.html')

@app.route('/study-guide')
def study_guide_generator_page():
    return render_template('study_guide_generator.html')

@app.route('/api/quiz', methods=['POST'])
def quiz_api():
    if not api_key: # Assuming api_key is globally available
        return jsonify({'error': 'API key not configured on server.'}), 500

    try:
        data = request.get_json()
        source_text = data.get('source_text')
        try:
            num_questions = int(data.get('num_questions', 5))
            if not (1 <= num_questions <= 15): # Validate range
                num_questions = 5
        except ValueError:
            num_questions = 5 # Default

        if not source_text or not source_text.strip():
            return jsonify({'error': 'Source text/topic is required.'}), 400

        prompt_parts = [
            f"Based on the following source text or topic: \"\"\"{source_text}\"\"\"",
            f"Generate exactly {num_questions} quiz questions.",
            "For each question, provide:",
            "  1. \"question\": The question text itself.",
            "  2. \"answer\": The correct answer to the question.",
            "  3. \"options\" (optional, but preferred for some questions): An array of 3-4 strings if it's a multiple-choice question. If not multiple-choice (e.g., true/false, short answer), this key can be omitted or be an empty array.",
            "Try to provide a mix of question types (e.g., multiple choice, true/false, short open-ended if appropriate for the content).",
            "The response MUST be a valid JSON array of objects, where each object represents a question and follows the structure described.",
            "Example of a multiple-choice question object: {\"question\": \"What is 2+2?\", \"options\": [\"3\", \"4\", \"5\"], \"answer\": \"4\"}",
            "Example of a true/false question object: {\"question\": \"Is the sky blue?\", \"answer\": \"True\"}",
            "Example of a short answer question object: {\"question\": \"What is the capital of France?\", \"answer\": \"Paris\"}",
            "Ensure the output is ONLY the JSON array. Do not include any introductory text or markdown formatting outside the JSON itself."
        ]
        final_prompt = "\n\n".join(prompt_parts)

        # print(f"DEBUG: Quiz Prompt: {final_prompt[:1000]}...") # For debugging

        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        response = model.generate_content(final_prompt)

        ai_response_text = ""
        if response and response.candidates and response.candidates[0].content.parts:
             ai_response_text = "".join(part.text for part in response.candidates[0].content.parts)
        else:
            return jsonify({'error': 'No response from AI model or unexpected response structure for quiz.'}), 500

        # print(f"DEBUG: Raw AI Response for quiz: {ai_response_text[:500]}...")

        try:
            cleaned_response_text = ai_response_text.strip()
            if cleaned_response_text.startswith("```json"):
                cleaned_response_text = cleaned_response_text[7:]
            elif cleaned_response_text.startswith("```"):
                cleaned_response_text = cleaned_response_text[3:]

            if cleaned_response_text.endswith("```"):
                cleaned_response_text = cleaned_response_text[:-3]

            cleaned_response_text = cleaned_response_text.strip()

            quiz_data = json.loads(cleaned_response_text)

            if not isinstance(quiz_data, list):
                # Attempt to handle if AI wraps list in a dict like {"quiz": [...]} or {"questions": [...]}
                if isinstance(quiz_data, dict):
                    if 'quiz' in quiz_data and isinstance(quiz_data['quiz'], list):
                        quiz_data = quiz_data['quiz']
                    elif 'questions' in quiz_data and isinstance(quiz_data['questions'], list):
                        quiz_data = quiz_data['questions']
                    else:
                        raise ValueError("AI response for quiz was valid JSON but not an array, and not a recognized wrapped list.")
                else:
                    raise ValueError("AI response for quiz was valid JSON but not an array.")

            # Basic validation of question structure
            for item in quiz_data:
                if not (isinstance(item, dict) and 'question' in item and 'answer' in item):
                    raise ValueError("Quiz items must have 'question' and 'answer' keys.")
                if 'options' in item and not isinstance(item['options'], list):
                    # Allow options to be null or undefined, but if present, must be a list
                    if item['options'] is not None:
                        raise ValueError("Question 'options', if present and not null, must be an array.")

            return jsonify({'quiz': quiz_data})

        except json.JSONDecodeError as e:
            print(f"Quiz JSONDecodeError: {e}. Raw AI response: {ai_response_text}")
            error_detail = f"AI response for quiz was not valid JSON. Error: {e}. Received: {ai_response_text[:200]}..."
            return jsonify({'error': error_detail}), 500
        except ValueError as e: # For our custom validation
             print(f"Quiz ValueError after JSON parsing: {e}. Raw AI response: {ai_response_text}")
             return jsonify({'error': f"AI response for quiz JSON structure was not as expected: {e}. Received: {ai_response_text[:200]}..."}), 500

    except Exception as e:
        print(f"Error in /api/quiz: {e}")
        return jsonify({'error': f'An unexpected error occurred on the server while generating quiz: {e}'}), 500

@app.route('/api/studyguide', methods=['POST'])
def study_guide_api():
    if not api_key: # Assuming api_key is globally available
        return jsonify({'error': 'API key not configured on server.'}), 500

    try:
        data = request.get_json()
        source_text = data.get('source_text')

        if not source_text or not source_text.strip():
            return jsonify({'error': 'Source text/topic is required for the study guide.'}), 400

        prompt_parts = [
            f"Generate a comprehensive, well-structured study guide based on the following source text or topic: \"\"\"{source_text}\"\"\".",
            "The study guide should aim to be informative and easy to understand.",
            "Structure the guide logically with sections, subsections, key concepts, summaries, definitions, and examples where appropriate.",
            "The output MUST be formatted entirely in Markdown.",
            "Use Markdown syntax for all formatting: headings (e.g., # Main Title, ## Section, ### Subsection), lists (using * or -), bold text (**bold**), italics (*italic*), and code blocks (```language\\ncode\\n```) or inline code (`code`) if the content involves programming or technical details.",
            "Ensure the content is thorough and covers the main aspects of the topic.",
            "Do not include any text or formatting outside of the Markdown content itself."
        ]
        final_prompt = "\n\n".join(prompt_parts)

        # print(f"DEBUG: Study Guide Prompt: {final_prompt[:1000]}...") # For debugging

        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        response = model.generate_content(final_prompt)

        ai_markdown_text = ""
        if response and response.candidates and response.candidates[0].content.parts:
             ai_markdown_text = "".join(part.text for part in response.candidates[0].content.parts)
        else:
            return jsonify({'error': 'No response from AI model or unexpected response structure for study guide.'}), 500

        # print(f"DEBUG: Raw AI Markdown for Study Guide: {ai_markdown_text[:500]}...")

        try:
            # Convert Markdown to HTML
            # Common extensions: 'fenced_code' for code blocks, 'tables' for tables,
            # 'sane_lists' for better list handling.
            html_output = markdown.markdown(ai_markdown_text, extensions=['fenced_code', 'tables', 'sane_lists'])

            return jsonify({'study_guide_content': html_output})

        except Exception as e:
            # This might catch errors during markdown conversion, though less common
            print(f"Error converting study guide Markdown to HTML: {e}")
            # Fallback: return raw markdown if conversion fails? Or specific error.
            # For now, let's return an error, as the frontend expects HTML.
            return jsonify({'error': f'Failed to convert study guide to HTML: {e}. Raw Markdown received: {ai_markdown_text[:200]}...'}), 500

    except Exception as e:
        print(f"Error in /api/studyguide: {e}")
        return jsonify({'error': f'An unexpected error occurred on the server while generating study guide: {e}'}), 500

@app.route('/api/flashcards', methods=['POST'])
def flashcards_api():
    if not api_key: # Assuming api_key is globally checked or available
        return jsonify({'error': 'API key not configured on server.'}), 500

    try:
        topic = request.form.get('topic')
        try:
            num_flashcards = int(request.form.get('num_flashcards', 5))
            if not (1 <= num_flashcards <= 10): # Validate range
                num_flashcards = 5
        except ValueError:
            num_flashcards = 5 # Default if conversion fails

        pdf_file = request.files.get('pdf_file')
        pdf_text = ""

        if not topic:
            return jsonify({'error': 'Topic is required.'}), 400

        if pdf_file:
            if pdf_file.filename == '':
                # This case might be fine if PDF is optional, frontend should not send empty file object
                # For now, let's assume if 'pdf_file' is in request.files, it should be a valid file.
                # However, an empty filename usually means no file was selected.
                pass # No file actually uploaded if filename is empty
            elif not pdf_file.filename.lower().endswith('.pdf'):
                return jsonify({'error': 'Invalid file type. Please upload a PDF.'}), 400
            else: # Process file if it has a name and is a PDF
                try:
                    pdf_stream = io.BytesIO(pdf_file.read())
                    reader = PyPDF2.PdfReader(pdf_stream)
                    for page_num in range(len(reader.pages)):
                        page = reader.pages[page_num]
                        pdf_text += page.extract_text() or ""
                    if not pdf_text.strip():
                         pdf_text = "" # Keep it empty if no text, rather than "Could not extract..."
                except Exception as e:
                    print(f"Error processing PDF: {e}")
                    return jsonify({'error': f'Error processing PDF: {e}'}), 500

        prompt_parts = [f"Topic: \"{topic}\""]
        if pdf_text:
            prompt_parts.append(f"Context from PDF (use this heavily for content if provided, otherwise focus on the topic): \"\"\"{pdf_text}\"\"\"")

        prompt_parts.append(f"Generate exactly {num_flashcards} flashcards based on the provided topic and PDF context (if any).")
        prompt_parts.append("Each flashcard must have a 'front' (a question or term) and a 'back' (the corresponding answer or definition).")
        prompt_parts.append("The response MUST be a valid JSON array of objects, where each object has a \"front\" key and a \"back\" key.")
        prompt_parts.append("Example: [{\"front\": \"What is photosynthesis?\", \"back\": \"The process by which green plants use sunlight, water, and carbon dioxide to create their own food.\"}, {\"front\": \"Term: Mitochondria\", \"back\": \"Definition: The powerhouse of the cell, responsible for generating most of the cell's supply of adenosine triphosphate (ATP).\"}]")
        prompt_parts.append("Do not include any text outside of this JSON array. Ensure correct JSON syntax, including proper escaping of special characters within strings if necessary. Output only the JSON.")

        final_prompt = "\n\n".join(prompt_parts)

        # print(f"DEBUG: Flashcard Prompt: {final_prompt[:1000]}...") # For debugging

        model = genai.GenerativeModel('gemini-1.5-flash-latest')

        response = model.generate_content(final_prompt)

        ai_response_text = ""
        if response and response.candidates and response.candidates[0].content.parts:
             ai_response_text = "".join(part.text for part in response.candidates[0].content.parts)
        else:
            return jsonify({'error': 'No response from AI model or unexpected response structure.'}), 500

        # print(f"DEBUG: Raw AI Response for flashcards: {ai_response_text[:500]}...")

        try:
            cleaned_response_text = ai_response_text.strip()
            if cleaned_response_text.startswith("```json"):
                cleaned_response_text = cleaned_response_text[7:]
            elif cleaned_response_text.startswith("```"):
                 cleaned_response_text = cleaned_response_text[3:]

            if cleaned_response_text.endswith("```"):
                cleaned_response_text = cleaned_response_text[:-3]

            cleaned_response_text = cleaned_response_text.strip()

            # Handle cases where the response might still not be a list, e.g. if API returns a single JSON object directly
            # or if it's wrapped in an outer object. For now, assume it aims for a list.
            if not cleaned_response_text.startswith('['):
                cleaned_response_text = '[' + cleaned_response_text + ']'


            flashcards_data = json.loads(cleaned_response_text)

            if not isinstance(flashcards_data, list):
                # Try to see if it's a single object that should have been a list
                if isinstance(flashcards_data, dict) and 'flashcards' in flashcards_data and isinstance(flashcards_data['flashcards'], list):
                    flashcards_data = flashcards_data['flashcards'] # Extract the list
                else:
                    raise ValueError("AI response was valid JSON but not an array, nor a recognized wrapped object.")

            for item in flashcards_data:
                if not (isinstance(item, dict) and 'front' in item and 'back' in item):
                    raise ValueError("AI response array items do not have 'front' and 'back' keys.")

            return jsonify({'flashcards': flashcards_data})

        except json.JSONDecodeError as e:
            print(f"JSONDecodeError: {e}. Raw AI response: {ai_response_text}")
            error_detail = f"AI response was not valid JSON. Error: {e}. Received: {ai_response_text[:200]}..."
            return jsonify({'error': error_detail}), 500
        except ValueError as e:
             print(f"ValueError after JSON parsing: {e}. Raw AI response: {ai_response_text}")
             return jsonify({'error': f"AI response JSON structure was not as expected: {e}. Received: {ai_response_text[:200]}..."}), 500

    except Exception as e:
        print(f"Error in /api/flashcards: {e}")
        return jsonify({'error': f'An unexpected error occurred on the server: {e}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) # Using port 5000 for consistency
