# AI-Powered Scammer Detection System

This document describes the AI-powered risk assessment features integrated into the Sui Scammer Detector system.

## Overview

The AI integration enhances the existing rule-based scammer detection with intelligent risk assessment using multiple AI models:

- **OpenAI GPT-4**: Advanced natural language processing for pattern recognition
- **Google Gemini Pro**: Multi-modal analysis and reasoning
- **Ollama (Local)**: Privacy-focused local AI inference

## Features

### 🧠 AI Risk Assessment
- Real-time transaction risk scoring (0-100%)
- Confidence levels for AI predictions
- Pattern detection and reasoning
- Multi-model consensus for accuracy

### 🔄 Hybrid Analysis
- Combines AI assessment with rule-based scoring
- Configurable AI weight in final risk calculation
- Fallback mechanisms when AI services are unavailable

### ⚡ Real-Time Monitoring
- Live transaction analysis during wallet monitoring
- Automatic alert generation based on AI findings
- Performance metrics and model comparison

### 🎛️ Configuration Management
- Smart contract-based AI configuration
- Admin controls for AI parameters
- Model selection and timeout settings

## Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in the `scammer-client` directory:

```bash
# Copy from .env.example
cp .env.example .env.local

# Edit the file with your API keys
nano .env.local
```

Configure the following AI service API keys:

```bash
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here

# Google Gemini Configuration  
VITE_GEMINI_API_KEY=your-gemini-api-key-here

# Ollama Configuration (for local AI)
VITE_OLLAMA_URL=http://localhost:11434

# AI Settings
VITE_AI_ENABLED=true
VITE_AI_DEFAULT_MODEL=gpt
VITE_AI_TIMEOUT_MS=5000
VITE_AI_CONFIDENCE_THRESHOLD=70
```

### 2. API Key Setup

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env.local` file

#### Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env.local` file

#### Ollama (Local AI)
1. Install Ollama: `curl -fsSL https://ollama.ai/install.sh | sh`
2. Pull a model: `ollama pull llama2`
3. Start Ollama service: `ollama serve`

### 3. Smart Contract Configuration

The AI configuration is stored on-chain and can be managed through the admin panel:

```typescript
// Default AI configuration
{
  enabled: true,
  risk_weight: 30,        // 30% AI, 70% rule-based
  confidence_threshold: 70,
  response_timeout: 5000, // 5 seconds
  fallback_enabled: true
}
```

### 4. Testing the Integration

Run the AI test script to verify configuration:

```bash
cd scammer-client
node test-ai.js
```

## Usage Guide

### Dashboard Integration

The AI features are integrated throughout the application:

1. **Dashboard**: AI-powered insights for recent transactions
2. **Monitoring**: Real-time AI risk assessment during wallet watching
3. **Admin Panel**: AI configuration and testing tools
4. **AI Status Tab**: Comprehensive AI system status and configuration

### AI Risk Validator Component

```tsx
<AIRiskValidator
  sender="0x..."
  recipient="0x..."
  amount="1000"
  enabled={true}
  onRiskAssessment={(assessment) => {
    console.log('Risk Score:', assessment.riskScore);
    console.log('Confidence:', assessment.confidence);
    console.log('Reasoning:', assessment.reasoning);
  }}
/>
```

### Enhanced Transaction Analyzer

```tsx
<EnhancedTransactionAnalyzer
  sender="0x..."
  recipient="0x..."
  amount="1000"
  onAnalysisComplete={(result) => {
    console.log('Combined Analysis:', result);
  }}
/>
```

## Architecture

### AI Service Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Service Layer                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   OpenAI    │  │   Gemini    │  │   Ollama    │         │
│  │   GPT-4     │  │   Pro       │  │   Local     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                 Fallback & Consensus                        │
├─────────────────────────────────────────────────────────────┤
│              Transaction Context Builder                    │
├─────────────────────────────────────────────────────────────┤
│                 Risk Assessment Engine                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Transaction Detection**: New transaction identified
2. **Context Building**: Gather sender/recipient history and network metrics
3. **AI Assessment**: Send to configured AI models
4. **Rule-Based Scoring**: Calculate traditional risk factors
5. **Hybrid Analysis**: Combine AI and rule-based scores
6. **Alert Generation**: Create alerts based on final risk score

## Performance & Security

### Performance Optimization
- Parallel AI model querying
- Configurable timeouts (default 5s)
- Caching for repeated assessments
- Batch processing for multiple transactions

### Security Considerations
- API keys stored securely in environment variables
- Local Ollama option for privacy-sensitive environments
- Rate limiting and error handling
- No sensitive transaction data logged

### Fallback Mechanisms
- Automatic fallback to alternative AI models
- Rule-based scoring when all AI models fail
- Graceful degradation with user notifications

## Monitoring & Analytics

### AI Performance Metrics
- Assessment success rate per model
- Average response times
- Confidence distribution
- Accuracy tracking (when ground truth available)

### Alert Analytics
- AI-generated alert frequency
- False positive/negative rates
- Model consensus agreement rates

## Troubleshooting

### Common Issues

1. **"AI assessment failed"**
   - Check API key configuration
   - Verify network connectivity
   - Check AI service rate limits

2. **"No AI models configured"**
   - Ensure at least one API key is set
   - Verify environment variables are loaded

3. **"Ollama connection failed"**
   - Check if Ollama service is running
   - Verify VITE_OLLAMA_URL is correct
   - Ensure a model is pulled (e.g., `ollama pull llama2`)

4. **Slow AI responses**
   - Reduce VITE_AI_TIMEOUT_MS
   - Use local Ollama for faster responses
   - Consider using lighter AI models

### Debug Mode

Enable debug logging:

```bash
# In browser console
localStorage.setItem('AI_DEBUG', 'true');
```

## Future Enhancements

- [ ] Machine learning model training on historical scam data
- [ ] Advanced pattern recognition with deep learning
- [ ] Integration with external threat intelligence feeds
- [ ] Custom AI model fine-tuning for blockchain-specific risks
- [ ] Multi-chain AI assessment support

## Contributing

To contribute to the AI features:

1. Follow the existing code patterns in `src/services/aiService.ts`
2. Add comprehensive error handling and fallbacks
3. Include tests for new AI functionality
4. Update this documentation with any new features

## Support

For AI-related issues:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Test with the `test-ai.js` script
4. Verify API key permissions and quotas
