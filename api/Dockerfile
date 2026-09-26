FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY db.py main.py manage.py ./
ENV DB_PATH=/data/pizarras.db TZ=America/Santiago
EXPOSE 5020
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5020", "--proxy-headers", "--forwarded-allow-ips", "*"]
