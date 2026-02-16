# Use official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies if needed (e.g., for certain python libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements or just the local dir if using pip install directly
# Note: Since we don't have a requirements.txt yet, we'll create one or use a command.
RUN pip install --no-cache-dir fastapi uvicorn motor pydantic-settings python-dotenv passlib[bcrypt] python-jose[cryptography] google-generativeai slowapi twilio

# Copy the rest of the application
COPY . .

# Expose the port (Railway provides $PORT)
ENV PORT=8000
EXPOSE 8000

# Start the application
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
