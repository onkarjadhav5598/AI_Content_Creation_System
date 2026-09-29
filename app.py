import json
import os

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, render_template, request, send_from_directory

from content_ai_system import (
    analyze_text,
    compare_parameters,
    generate_content,
    plan_podcast,
)

app = Flask(__name__)


def _log_io(label: str, inp: dict, out: dict | list | str) -> None:
    try:
        print(f"\n{'=' * 60}\n{label}\n{'=' * 60}")
        print("INPUT:")
        print(json.dumps(inp, indent=2, ensure_ascii=True))
        print("OUTPUT:")
        if isinstance(out, str):
            text = out if len(out) <= 4000 else out[:4000] + "\n... [truncated]"
            print(text.encode("ascii", errors="replace").decode("ascii"))
        else:
            print(json.dumps(out, indent=2, ensure_ascii=True))
    except Exception:
        print("[log] Could not print output (encoding issue).")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, "static"),
        "favicon.svg",
        mimetype="image/svg+xml",
    )


@app.route("/api/generate", methods=["POST"])
def api_generate():
    data = request.get_json(force=True) or {}
    topic = (data.get("topic") or "").strip()
    content_type = (data.get("content_type") or "story").strip().lower()
    if not topic:
        return jsonify({"error": "Topic is required."}), 400
    try:
        content = generate_content(topic, content_type)
        payload = {"content": content, "content_type": content_type}
        _log_io("Content generation", data, payload)
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/podcast", methods=["POST"])
def api_podcast():
    data = request.get_json(force=True) or {}
    topic = (data.get("topic") or "").strip()
    if not topic:
        return jsonify({"error": "Topic is required."}), 400
    try:
        plan = plan_podcast(topic)
        _log_io("Podcast planning", data, plan)
        return jsonify(plan)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Text is required."}), 400
    try:
        analysis = analyze_text(text)
        _log_io("Text analysis", data, analysis)
        return jsonify(analysis)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/compare", methods=["POST"])
def api_compare():
    data = request.get_json(force=True) or {}
    topic = (data.get("topic") or "").strip()
    if not topic:
        return jsonify({"error": "Topic is required."}), 400
    try:
        comparisons = compare_parameters(topic)
        payload = {"comparisons": comparisons}
        _log_io("Parameter experiment", data, payload)
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    if not os.getenv("GROQ_API_KEY"):
        print("Warning: Set GROQ_API_KEY in .env before running.")
    app.run(debug=True, port=5000)
