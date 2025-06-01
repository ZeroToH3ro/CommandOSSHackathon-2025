# Sui Scammer Detector - AI-Powered Security Platform

> An intelligent blockchain security platform that detects scam transactions on the Sui network using AI-powered risk assessment and real-time monitoring.

## 🎯 Overview

The Sui Scammer Detector is a comprehensive security solution designed to protect users from fraudulent activities on the Sui blockchain. It combines advanced AI models with rule-based detection to provide real-time transaction analysis and risk assessment.

### Key Features

- 🧠 **AI-Powered Risk Assessment** - Multi-model AI analysis using OpenAI GPT-4 (future), Google Gemini Pro(future), and local Ollama models
- 🔍 **Real-Time Transaction Monitoring** - Live wallet monitoring with instant alerts
- 📊 **Advanced Dashboard** - Comprehensive analytics and visualizations
- ⚡ **Smart Contract Integration** - On-chain scammer registry with reputation tracking
- 🛡️ **Pattern Detection** - Machine learning-based anomaly detection
- 🎛️ **Admin Controls** - Complete system management and configuration

## 🏗️ Architecture

### Smart Contract Layer (`scammer/`)
- **Move Smart Contract** on Sui blockchain
- On-chain scammer address registry
- Reputation scoring system
- Secure admin controls

### Client Application (`scammer-client/`)
- **React + TypeScript** frontend
- **Sui dApp Kit** for blockchain integration
- **AI Service Integration** for risk assessment
- **Real-time monitoring** capabilities

## 🛠️ Tech Stack

### Blockchain
- **Sui Network** - High-performance blockchain platform
- **Move Language** - Smart contract development
- **Sui dApp Kit** - Wallet integration and transaction handling

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Radix UI** - Modern component library
- **TailwindCSS** - Utility-first styling
- **Zustand** - State management

### AI & Analytics
- **OpenAI GPT-4** - Advanced language processing - Future
- **Google Gemini Pro** - Multi-modal AI analysis - Future
- **Ollama** - Local AI inference
- **TanStack Query** - Data fetching and caching

### Development Tools
- **pnpm** - Fast package manager
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm package manager
- Sui CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/command-oss-hackathon.git
   cd command-oss-hackathon
   ```

2. **Deploy Smart Contract**
   ```bash
   cd scammer
   sui move build
   sui client publish --gas-budget 100000000
   ```

3. **Set up the Client Application**
   ```bash
   cd ../scammer-client
   pnpm install
   ```

4. **Configure Environment**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your API keys and contract addresses
   ```

5. **Start Development Server**
   ```bash
   pnpm dev
   ```

Visit `http://localhost:5173` to access the application.

## 📋 Features

### Dashboard
- **Real-time Metrics** - Transaction volume, risk scores, detection rates
- **Visual Analytics** - Charts and graphs for trend analysis
- **Alert Summary** - Recent security alerts and notifications

### Transaction Monitoring
- **Wallet Watching** - Monitor specific addresses for suspicious activity
- **Risk Assessment** - AI-powered scoring from 0-100%
- **Pattern Detection** - Identify unusual transaction patterns

### AI Integration
- **Multi-Model Analysis** - Combine multiple AI providers for accuracy
- **Confidence Scoring** - Reliability metrics for AI predictions
- **Fallback Systems** - Graceful degradation when AI services are unavailable

### Admin Panel
- **System Status** - Monitor detector health and performance
- **Configuration** - Adjust detection parameters and thresholds
- **Address Management** - Maintain scammer address registry

## 🧪 Testing

### Smart Contract Tests
```bash
cd scammer
sui move test
```

### Client Application Tests
```bash
cd scammer-client
pnpm test
```

### AI Integration Tests
```bash
# Test AI service connections
node test-ai.js

# Test enhanced analysis
node test-ai-enhanced.js
```

## 📁 Project Structure

```
command-oss-hackathon/
├── scammer/                    # Smart contract
│   ├── sources/
│   │   └── scammer.move       # Main contract logic
│   ├── tests/
│   │   └── scammer_tests.move # Contract tests
│   └── Move.toml              # Project configuration
├── scammer-client/            # Frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API services
│   │   ├── hooks/             # Custom hooks
│   │   ├── store/             # State management
│   │   └── types/             # TypeScript definitions
│   ├── package.json
│   └── vite.config.mts
└── deploy.sh                  # Deployment script
```

## 🔧 Configuration

### AI Services Setup
1. **OpenAI**: Add your API key to environment variables
2. **Google Gemini**: Configure Gemini Pro API access
3. **Ollama**: Set up local inference server

See `OLLAMA_SETUP.md` for detailed local AI setup instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Hackathon Project

This project was created for the Command OSS Hackathon 2025, showcasing innovative blockchain security solutions with AI integration.

## 📞 Support

For questions or support, please open an issue on GitHub or contact Z3ro.

---

**Built with ❤️ for the Sui ecosystem**
