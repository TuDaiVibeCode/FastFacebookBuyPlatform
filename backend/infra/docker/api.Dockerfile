FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /workspace/backend/apps/api

RUN python -m pip install --upgrade pip && \
    python -m pip install fastapi "uvicorn[standard]" pydantic pydantic-settings redis chromadb httpx python-dotenv psycopg[binary] passlib[bcrypt] "python-jose[cryptography]"

COPY apps/api /workspace/backend/apps/api
COPY packages/sample-data /workspace/backend/packages/sample-data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
