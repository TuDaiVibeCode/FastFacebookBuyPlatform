FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /workspace/backend/apps/api

RUN python -m pip install --upgrade pip && \
    python -m pip install fastapi "uvicorn[standard]" pydantic pydantic-settings redis chromadb httpx python-dotenv

COPY . /workspace/backend

RUN if [ -f requirements.txt ]; then python -m pip install -r requirements.txt; fi && \
    if [ -f pyproject.toml ]; then python -m pip install -e .; fi

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
