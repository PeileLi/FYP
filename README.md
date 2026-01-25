# 🌐 Blockchain Crowdfunding Platform

A transparent and traceable donation platform powered by **Hyperledger Fabric** blockchain technology.

## ✨ Features

- 🔗 **Blockchain Integration**: All campaigns automatically recorded on Hyperledger Fabric
- 🔐 **Immutable Records**: Blockchain certificates for verification
- 💰 **Real-time Tracking**: Track donations with blockchain transparency
- 👤 **User Authentication**: Secure JWT-based authentication
- 📊 **Campaign Management**: Create, manage, and track fundraising campaigns
- 🎨 **Modern UI**: Beautiful React frontend with real-time updates

## 🛠 Tech Stack

- **Blockchain**: Hyperledger Fabric 2.5.x
- **Smart Contract**: Go
- **Backend**: Spring Boot 3.x + Java 17
- **Frontend**: React 18 + Vite
- **Database**: PostgreSQL 15
- **Container**: Docker & Docker Compose
- **Identity**: Fabric CA

## 📁 Project Structure

```
FYP/
├── backend/              # Spring Boot backend API
├── frontend/             # React frontend application
├── chaincode/            # Fabric smart contracts (Go)
├── fabric/               # Fabric samples (git submodule)
│   └── fabric-samples/
│       └── test-network/ # Fabric test network
├── scripts/              # Automation scripts
│   ├── start-fabric.sh   # Start Fabric network
│   ├── stop-all.sh       # Stop all services
│   └── restart-all.sh    # Restart everything
├── docs/                 # Documentation
│   ├── fabric开发.md      # Development guide
│   ├── 快速参考卡.md       # Quick reference
│   └── 跨平台配置总结.md   # Cross-platform setup
├── docker-compose.yml    # Docker orchestration
├── .env.example          # Environment template
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (Mac) or Docker Engine (Linux/WSL)
- Git
- 8GB RAM minimum, 16GB recommended

### Installation

#### 1. Clone the Repository

```bash
# Linux/WSL
cd ~
git clone https://github.com/PeileLi/FYP.git
cd FYP

# Mac
cd ~/projects
git clone https://github.com/PeileLi/FYP.git
cd FYP
```

#### 2. Initialize Submodules

```bash
git submodule update --init --recursive
```

#### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# ✅ No need to modify paths - works on Linux, WSL, and Mac!
```

#### 4. Start Services

```bash
# Start Fabric network and chaincode
./scripts/start-fabric.sh

# Start application services
docker compose up -d
```

#### 5. Verify

```bash
# Check all containers are running
docker ps

# Check backend logs
docker logs fyp-backend | grep "Fabric Gateway"

# Should see: ✅ Fabric Gateway initialized successfully
```

#### 6. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- API Docs: http://localhost:8080/swagger-ui.html

### Default Credentials

```
Email: test@example.com
Password: password
```

## 🖥 Platform Support

This project **automatically adapts** to your operating system:

| Platform | Status | Notes |
|----------|--------|-------|
| **Linux** | ✅ Fully Supported | Ubuntu 20.04+ |
| **WSL2** | ✅ Fully Supported | Windows 11 recommended |
| **macOS** | ✅ Fully Supported | Intel & Apple Silicon |

**Features:**
- ✅ Auto-detects OS
- ✅ Uses relative paths (no hardcoded paths)
- ✅ Works in any directory
- ✅ No manual path configuration needed

## 📚 Documentation

- **[Development Guide](docs/fabric开发.md)** - Complete development manual
- **[Quick Reference](docs/快速参考卡.md)** - One-page command reference
- **[Cross-Platform Setup](docs/跨平台配置总结.md)** - Platform-specific setup
- **[Scripts README](scripts/README.md)** - Automation scripts guide

## 🔧 Common Commands

### Start/Stop Services

```bash
# Start everything
./scripts/start-fabric.sh && docker compose up -d

# Stop application only (keep Fabric running)
docker compose stop

# Stop everything
./scripts/stop-all.sh

# Restart everything
./scripts/restart-all.sh
```

### View Logs

```bash
# All logs
docker compose logs -f

# Backend only
docker logs -f fyp-backend

# Fabric peer
docker logs peer0.org1.example.com
```

### Check Status

```bash
# All containers
docker ps

# Application status
docker compose ps

# Fabric network status
docker ps | grep -E "(peer|orderer)"
```

## 🧪 Testing Blockchain Integration

### Test Chaincode

```bash
cd fabric/fabric-samples/test-network

# Create a test campaign
./network.sh cc invoke -c mychannel -ccn donation \
  -ccic '{"function":"CreateCampaign","Args":["TEST001","Alice","2024-01-25T10:00:00","Test Campaign",""]}'

# Query the campaign
./network.sh cc query -c mychannel -ccn donation \
  -ccqc '{"function":"ReadCampaign","Args":["TEST001"]}'
```

### Test API

```bash
# Health check
curl http://localhost:8080/actuator/health

# Get campaigns
curl http://localhost:8080/api/campaigns
```

## 🐛 Troubleshooting

### Fabric Gateway Connection Failed

```bash
# Check Fabric network
docker ps | grep peer

# Restart everything
./scripts/restart-all.sh
```

### Port Already in Use

```bash
# Find process using port
lsof -i :8080  # or :3000, :7051

# Kill process
kill -9 <PID>
```

### Docker Issues

```bash
# Clean up Docker
docker system prune -a
docker volume prune

# Restart Docker Desktop (Mac)
osascript -e 'quit app "Docker"'
open -a Docker
```

## 📖 Development Workflow

### Daily Development

```bash
# 1. Start Fabric (if not running)
./scripts/start-fabric.sh

# 2. Start application
docker compose up -d

# 3. View logs
docker compose logs -f backend
```

### After Code Changes

```bash
# Frontend - hot reload (no restart needed)

# Backend
docker compose build backend
docker compose restart backend

# Chaincode
cd chaincode
# Edit chaincode.go
./deploy.sh donation . go 1.1 2  # Update version
docker compose restart backend
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Peile Li** - *Initial work* - [PeileLi](https://github.com/PeileLi)

## 🙏 Acknowledgments

- Hyperledger Fabric community
- Fabric Samples repository
- All contributors to this project

---

## 📞 Support

- **Documentation**: Check `docs/` folder
- **Issues**: [GitHub Issues](https://github.com/PeileLi/FYP/issues)
- **Fabric Docs**: https://hyperledger-fabric.readthedocs.io

---

**Last Updated**: January 2026  
**Version**: 2.0  
**Status**: Active Development


