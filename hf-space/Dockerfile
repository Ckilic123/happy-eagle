# Free Hugging Face Space (Docker SDK) — a tiny background-removal API using rembg.
FROM python:3.11-slim

ENV U2NET_HOME=/app/.u2net
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Pre-download the model at build time so the first request is fast.
RUN python -c "from rembg import new_session; new_session('u2net')"

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
