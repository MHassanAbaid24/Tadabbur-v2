FROM python:3.11-slim

WORKDIR /code

# Copy and install dependencies
COPY requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy backend source code
COPY . /code

# Hugging Face Spaces strictly requires port 7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
