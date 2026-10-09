FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api ./api
COPY ml/__init__.py ml/model.py ml/rules.py ml/model.joblib ./ml/
# Cloud Run sets $PORT
CMD exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}
