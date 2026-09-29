"""
Assignment No 8: AI-Powered Content Creation and Analysis System
Uses Groq API.
"""
import json
import os
import re

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")


def get_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY environment variable is missing. Please set GROQ_API_KEY in your .env file."
        )
    return Groq(api_key=api_key)


def call_llm(prompt, temperature=0.7, top_p=1.0, max_tokens=2048, json_mode=False):
    client = get_client()
    kwargs = {
        "model": MODEL,
        "messages": [
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "top_p": top_p,
        "max_completion_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    msg = response.choices[0].message
    # Some models (e.g. gpt-oss-120b) put output in the reasoning field
    text = msg.content or ""
    if not text.strip() and hasattr(msg, "reasoning") and msg.reasoning:
        text = msg.reasoning
    return text.strip()



def _parse_json_response(raw):
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw_output": raw}


def build_structured_prompt(role, context, task, constraints, output_format):
    prompt = f"""
Role: {role}
Context: {context}
Task: {task}
Constraints: {constraints}
Output Format: {output_format}
"""
    return prompt.strip()


def generate_content(topic, content_type="story"):
    role_map = {
        "story": "You are a creative fiction writer.",
        "poem": "You are an award-winning poet.",
        "post": "You are a professional social-media content creator.",
    }
    task_map = {
        "story": f"Write a short, engaging story (150-200 words) about '{topic}'.",
        "poem": f"Write a 4-stanza rhyming poem about '{topic}'.",
        "post": f"Write an engaging social media post (under 60 words, "
        f"with 3 relevant hashtags) about '{topic}'.",
    }
    if content_type not in role_map:
        content_type = "story"
    prompt = build_structured_prompt(
        role=role_map[content_type],
        context=f"The audience is general readers interested in '{topic}'.",
        task=task_map[content_type],
        constraints="Keep the tone positive, avoid offensive language, "
        "and stay within the specified word limit.",
        output_format="Return only the final content, no extra commentary.",
    )
    return call_llm(prompt, temperature=0.8)


def plan_podcast(topic):
    prompt = build_structured_prompt(
        role="You are an experienced podcast producer and content strategist.",
        context=f"A new podcast episode is being planned on the topic '{topic}'.",
        task="Generate: 1) a catchy podcast title, 2) a 2-3 line episode "
        "description, 3) the ideal type of guest to invite, and "
        "4) five thoughtful interview questions.",
        constraints="Keep the title under 10 words. Questions should be "
        "open-ended, not yes/no.",
        output_format=(
            'Return valid JSON only with keys: '
            '"title", "description", "guest_type", "questions" (a list of 5 strings).'
        ),
    )
    return _parse_json_response(call_llm(prompt, temperature=0.7, max_tokens=800, json_mode=True))


def analyze_text(user_text):
    prompt = build_structured_prompt(
        role="You are a Natural Language Processing (NLP) analysis engine.",
        context="The user has supplied a piece of text that needs analysis.",
        task=f'Analyze the following text:\n"""{user_text}"""\n'
        "Determine its overall sentiment (Positive / Negative / Neutral) "
        "with a confidence score (0-1), and extract the top 5 keywords.",
        constraints="Be objective and base the sentiment strictly on the text given.",
        output_format=(
            'Return valid JSON only with keys: '
            '"sentiment", "confidence", "keywords" (a list of 5 strings).'
        ),
    )
    return _parse_json_response(call_llm(prompt, temperature=0.3, max_tokens=400, json_mode=True))


def compare_parameters(topic):
    prompt = build_structured_prompt(
        role="You are a professional social-media content creator.",
        context=f"The audience is general readers interested in '{topic}'.",
        task=f"Write a short social media post (under 40 words) about '{topic}'.",
        constraints="Keep tone positive.",
        output_format="Return only the post text.",
    )
    settings = [
        {"label": "Low temperature (0.2) - focused/deterministic", "temperature": 0.2, "top_p": 1.0},
        {"label": "Medium temperature (0.7) - balanced", "temperature": 0.7, "top_p": 1.0},
        {"label": "High temperature (1.0) - creative/diverse", "temperature": 1.0, "top_p": 1.0},
        {"label": "Low top-p (0.3) - narrow token sampling", "temperature": 0.9, "top_p": 0.3},
    ]
    results = []
    for s in settings:
        output = call_llm(
            prompt,
            temperature=s["temperature"],
            top_p=s["top_p"],
            max_tokens=80,
        )
        results.append({"setting": s["label"], "output": output})
    return results


def main():
    print("=== AI-Powered Content Creation and Analysis System ===")
    topic = input("Enter a topic: ").strip()
    print("\n--- 1 & 2: CONTENT GENERATION ---")
    content_type = input("Choose content type (story/poem/post): ").strip().lower()
    content = generate_content(topic, content_type)
    print(f"\nGenerated {content_type}:\n{content}")
    print("\n--- 3: PODCAST PLANNING ---")
    podcast_plan = plan_podcast(topic)
    print(json.dumps(podcast_plan, indent=2))
    print("\n--- 4: TEXT ANALYSIS ---")
    user_text = input("\nEnter text to analyze for sentiment/keywords: ").strip()
    analysis = analyze_text(user_text)
    print(json.dumps(analysis, indent=2))
    print("\n--- 5: PARAMETER EXPERIMENTATION ---")
    comparisons = compare_parameters(topic)
    for c in comparisons:
        print(f"\n[{c['setting']}]\n{c['output']}")


if __name__ == "__main__":
    from dotenv import load_dotenv

    load_dotenv()
    main()
