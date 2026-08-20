FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install requests flask
CMD ["python3", "moon.py"]
