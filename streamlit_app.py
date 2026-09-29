import json
import os
import streamlit as st
from dotenv import load_dotenv

from content_ai_system import (
    analyze_text,
    compare_parameters,
    generate_content,
    plan_podcast,
)

load_dotenv()

# Page Configuration
st.set_page_config(
    page_title="AI Content & Analysis Studio",
    page_icon="✦",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Styling
st.markdown(
    """
    <style>
    .main { background-color: #0d1117; }
    .stButton>button {
        width: 100%;
        border-radius: 10px;
        font-weight: 600;
        background: linear-gradient(135deg, #10b981, #059669);
        color: #042f2e;
        border: none;
        padding: 0.6rem 1rem;
    }
    .stButton>button:hover {
        opacity: 0.92;
        color: #042f2e;
    }
    .metric-card {
        background: #161b22;
        padding: 1.25rem;
        border-radius: 12px;
        border: 1px solid #30363d;
        margin-bottom: 1rem;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# Sidebar
with st.sidebar:
    st.title("✦ AI Studio")
    st.caption("Powered by Groq (`qwen/qwen3.8-27b`)")
    st.divider()

    # Check API Key
    groq_key = st.secrets.get("GROQ_API_KEY", os.getenv("GROQ_API_KEY", ""))
    if not groq_key:
        user_key = st.text_input("Enter Groq API Key", type="password", placeholder="gsk_...")
        if user_key:
            os.environ["GROQ_API_KEY"] = user_key
            st.success("API Key set!")
        else:
            st.warning("Please provide a Groq API Key to proceed.")
    else:
        st.success("Groq API Key detected ✔")

    st.divider()
    with st.expander("📐 Prompt Engineering Blueprint"):
        st.markdown(
            """
            **Assignment 8 Requirements**:
            - **Role**: Specialized system persona
            - **Context**: Target audience framing
            - **Task**: Explicit generation directive
            - **Constraints**: Word limit & quality filters
            - **Output Format**: Clean text / Strict JSON
            """
        )

# Main Title
st.title("AI Content Creation & Analysis System")
st.write("Generate creative content, blueprint podcasts, analyze text sentiment, and experiment with LLM hyperparameters.")

# Tabs for Features
tab_content, tab_podcast, tab_analysis, tab_params = st.tabs(
    ["📖 Content Generation", "🎙️ Podcast Planner", "🔍 NLP Text Analysis", "🧪 Parameter Experiment"]
)

# 1. Content Generation
with tab_content:
    col1, col2 = st.columns([1, 1.2])

    with col1:
        st.subheader("Configuration")
        topic_content = st.text_input("Topic", placeholder="e.g. Artificial Intelligence in Healthcare", key="topic_content")
        content_type = st.radio(
            "Format",
            options=["story", "poem", "post"],
            format_func=lambda x: {
                "story": "📖 Story (150–200 words)",
                "poem": "✒️ Rhyming Poem (4 stanzas)",
                "post": "📱 Social Post (<60 words, 3 hashtags)",
            }[x],
            horizontal=True,
        )
        generate_btn = st.button("Generate Content", key="btn_gen_content")

    with col2:
        st.subheader("Result")
        if generate_btn:
            if not topic_content.strip():
                st.error("Please enter a topic.")
            else:
                with st.spinner("Writing with Groq..."):
                    try:
                        result = generate_content(topic_content, content_type)
                        st.markdown(f"### Generated {content_type.capitalize()}")
                        st.write(result)
                        st.code(result, language="markdown")
                    except Exception as e:
                        st.error(f"Error: {e}")

# 2. Podcast Planning
with tab_podcast:
    col1, col2 = st.columns([1, 1.2])

    with col1:
        st.subheader("Episode Topic")
        topic_podcast = st.text_input("Topic", placeholder="e.g. The Future of Electric Aviation", key="topic_podcast")
        podcast_btn = st.button("Plan Podcast Episode", key="btn_podcast")

    with col2:
        st.subheader("Blueprint Output")
        if podcast_btn:
            if not topic_podcast.strip():
                st.error("Please enter a podcast topic.")
            else:
                with st.spinner("Structuring podcast blueprint..."):
                    try:
                        plan = plan_podcast(topic_podcast)
                        st.success(f"**Title:** {plan.get('title', 'Untitled')}")
                        st.info(f"**Description:** {plan.get('description', '')}")
                        st.markdown(f"**🎙️ Ideal Guest:** `{plan.get('guest_type', 'Expert')}`")

                        st.markdown("#### Interview Questions:")
                        for idx, q in enumerate(plan.get("questions", []), 1):
                            st.write(f"**Q{idx}:** {q}")

                        with st.expander("View Raw JSON"):
                            st.json(plan)
                    except Exception as e:
                        st.error(f"Error: {e}")

# 3. NLP Text Analysis
with tab_analysis:
    col1, col2 = st.columns([1, 1.2])

    with col1:
        st.subheader("Input Text")
        input_text = st.text_area("Paste text to analyze", height=180, placeholder="Paste customer review, article, or statement here...")
        analyze_btn = st.button("Analyze Text", key="btn_analyze")

    with col2:
        st.subheader("Analysis Insights")
        if analyze_btn:
            if not input_text.strip():
                st.error("Please provide text to analyze.")
            else:
                with st.spinner("Analyzing sentiment and extracting keywords..."):
                    try:
                        analysis = analyze_text(input_text)
                        sentiment = analysis.get("sentiment", "Neutral")
                        confidence = analysis.get("confidence", 0.0)
                        keywords = analysis.get("keywords", [])

                        c1, c2 = st.columns(2)
                        c1.metric("Sentiment", sentiment)
                        c2.metric("Confidence", f"{round(confidence * 100)}%")

                        st.progress(float(confidence))

                        st.markdown("#### Extracted Keywords:")
                        st.write(" • ".join([f"`#{k}`" for k in keywords]))

                        with st.expander("View Raw JSON"):
                            st.json(analysis)
                    except Exception as e:
                        st.error(f"Error: {e}")

# 4. Parameter Experimentation
with tab_params:
    st.subheader("Compare Hyperparameters (Temperature & Top-p)")
    topic_compare = st.text_input("Experiment Topic", placeholder="e.g. Electric sports cars", key="topic_compare")
    compare_btn = st.button("Run Parameter Experiment", key="btn_compare")

    if compare_btn:
        if not topic_compare.strip():
            st.error("Please enter a topic.")
        else:
            with st.spinner("Running 4 comparative LLM runs..."):
                try:
                    comparisons = compare_parameters(topic_compare)
                    grid = st.columns(2)
                    for idx, c in enumerate(comparisons):
                        with grid[idx % 2]:
                            st.markdown(f"**{c.get('setting')}**")
                            st.info(c.get("output"))
                except Exception as e:
                    st.error(f"Error: {e}")
