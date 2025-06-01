# Ollama Setup Guide for Sui Scammer Detector

## Issues Fixed

The TypeScript errors you encountered have been resolved:

1. **Undefined response handling**: Added proper null/undefined checks in `parseAIResponse`
2. **404 Ollama errors**: Improved error handling and connection testing
3. **Better model selection**: Automatically selects available models

## Setup Ollama

### 1. Install Ollama

```bash
# On Linux/macOS
curl -fsSL https://ollama.ai/install.sh | sh

# Or download from https://ollama.ai/download
```

### 2. Start Ollama Service

```bash
# Start Ollama (runs on http://localhost:11434 by default)
ollama serve
```

### 3. Pull a Language Model

```bash
# Install a lightweight model (recommended for development)
ollama pull llama2

# Or other models:
# ollama pull mistral
# ollama pull codellama
# ollama pull llama3
```

### 4. Verify Installation

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Should return JSON with available models
```

## Environment Configuration

Create a `.env` file in the scammer-client directory:

```env
# Optional: Custom Ollama URL (defaults to http://localhost:11434)
VITE_OLLAMA_URL=http://localhost:11434
```

## Testing the Integration

1. Start Ollama service
2. Pull a model (e.g., `ollama pull llama2`)
3. Start your development server: `npm run dev`
4. The AI risk validator should now work

## Troubleshooting

### "Ollama not running" Error
- Ensure Ollama service is started: `ollama serve`
- Check if port 11434 is available
- Verify firewall settings

### "No models available" Error
- Pull at least one model: `ollama pull llama2`
- Check available models: `ollama list`

### Connection Refused
- Ollama might be running on a different port
- Check VITE_OLLAMA_URL environment variable
- Ensure no CORS issues (Ollama should allow localhost by default)

## Model Recommendations

For this scam detection use case:

1. **llama2** (3.8GB) - Good general purpose, recommended for development
2. **mistral** (4.1GB) - Fast and efficient
3. **codellama** (3.8GB) - Good for technical analysis
4. **llama3** (4.7GB) - Latest and most capable (if available)

The system will automatically select the best available model.
