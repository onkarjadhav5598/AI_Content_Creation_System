# AI-Powered Content Creation and Analysis System

A modern AI Studio built with Flask and Groq LLMs (`qwen/qwen3.8-27b`), featuring a ChatGPT/Gemini-style conversational interface.

## ✨ Features

- **📖 Story Generation**: Creative narratives crafted with structured role prompting.
- **✒️ Poetry**: 4-stanza rhyming poems with rich evocative imagery.
- **📱 Social Media Posts**: Engaging posts with targeted hashtags.
- **🎙️ Podcast Blueprint**: Complete episode planning (title, episode description, guest profile, and 5 open-ended interview questions).
- **🔍 NLP Text Analysis**: Objective sentiment classification with confidence score and top keyword extraction.
- **🧪 Parameter Experimentation**: Compare responses across different temperature (0.2, 0.7, 1.0) and top-p (0.3) settings.
- **📋 Instant Copy**: One-click copy on every output card with visual confirmation.
- **📐 Prompt Blueprint**: In-app inspector displaying Role, Context, Task, Constraints, and Output Format.

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

### 2. Set up virtual environment
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and add your Groq API key:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```

### 5. Run the application
```bash
python app.py
```
Open [http://localhost:5000](http://localhost:5000) in your browser.


thank you :)
