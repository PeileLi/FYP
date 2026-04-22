# Blockchain Crowdfunding Platform — User Manual

A transparent and traceable donation platform powered by **Hyperledger Fabric**.

Follow the steps below to deploy and evaluate the system on a single machine.

Github repo: <https://github.com/PeileLi/FYP>

---

## 1. Tech Stack

- **Blockchain**: Hyperledger Fabric 2.5.14 (Fabric CA 1.5.15)
- **Smart Contract**: Go
- **Backend**: Spring Boot (Java 17)
- **Frontend**: React + Vite
- **Database**: PostgreSQL 15 (local container by default)
- **Container**: Docker & Docker Compose

## 2. Project Structure

```
FYP/
├── backend/            # Spring Boot backend service
├── frontend/           # React frontend application
├── chaincode/          # Hyperledger Fabric smart contracts (Go)
├── fabric/             # fabric-samples (git submodule)
├── docker-compose.yml  # Application services
├── run.sh              # One-click startup script
├── .env.example        # Environment variable template
└── README.md
```

---

## 3. Prerequisites

### 3.1 Operating System

- **Linux** (Ubuntu 20.04+ recommended) or **macOS**
- Windows users: please use **WSL2** with Ubuntu
- Minimum **8 GB RAM**, **20 GB** free disk space

### 3.2 Required Software

The `run.sh` script will attempt to install missing components automatically, but it is strongly recommended to have the following installed beforehand:

| Software | Version | Purpose |
| -------- | ------- | ------- |
| Docker   | 20.10+  | Container runtime |
| Docker Compose | v2.0+ | Multi-container orchestration |
| Git      | 2.0+    | Source code & submodules |
| curl     | any     | Downloading Fabric binaries |

> The current user should be in the `docker` group (Linux) so that `docker` commands can run without `sudo`.

---

## 4. Quick Start (One-Click)

### Step 1 — Clone the repository

```bash
git clone --recurse-submodules https://github.com/PeileLi/FYP.git
cd FYP
```

If the repository is already cloned without submodules, run:

```bash
git submodule update --init --recursive
```

### Step 2 — Create the environment file

```bash
cp .env.example .env
```

The defaults in `.env.example` work out-of-the-box with the bundled PostgreSQL container and local image storage.

### Step 3 — Launch the whole system

```bash
chmod +x run.sh
./run.sh
```

The script performs the following automatically:

1. Check / install Docker & Docker Compose
2. Initialize the `fabric-samples` submodule and download Fabric 2.5.14 binaries & Docker images
3. Start the Hyperledger Fabric test network and create channel `mychannel`
4. Package, install, approve, and commit the chaincode `smartcontract`
5. Build and start the backend, frontend, and PostgreSQL containers
6. Wait until the backend health check passes

Total first-run time is typically **5–15 minutes**, depending on network speed.

### Step 4 — Access the application

Once the script prints `All Services Started Successfully`, open your browser:

| Service | URL |
| ------- | --- |
| Frontend| <http://localhost:3000> |
| Backend REST API| <http://localhost:8080> |
| Backend health check | <http://localhost:8080/api/stats/public> |
| PostgreSQL | `localhost:5432` (user `postgres`, password `postgres`, db `fyp_db`) |

---

## 5. How to Evaluate the Platform

The system supports **four user roles**:

| Role | Description |
| ---- | ----------- |
| `USER`      | Donor — browse campaigns and make donations |
| `INITIATOR` | Campaign initiator — create and manage campaigns |
| `PARTNER`   | Third-party auditor (Org2 MSP) — review campaigns and submit audit results |
| `ADMIN`     | Administrator — full oversight of users, campaigns, donations, and blockchain statistics |

### 5.1 Register a donor

1. Visit <http://localhost:3000>
2. Click **Register** and create an account — new accounts default to role `USER`
3. Log in, browse approved campaigns, and submit a test donation

### 5.2 Promote a user to other roles 

Because role elevation requires administrator privileges, the simplest way for the supervisor to evaluate all role-specific features is to promote an existing registered account directly in the database.

Run the following inside the PostgreSQL container (replace `<username>` with the username you registered):

```bash
# Promote to ADMIN
docker exec -it fyp-postgres psql -U postgres -d fyp_db \
  -c "UPDATE users SET role='ADMIN' WHERE username='<username>';"

# Promote to INITIATOR
docker exec -it fyp-postgres psql -U postgres -d fyp_db \
  -c "UPDATE users SET role='INITIATOR' WHERE username='<username>';"

# Promote to PARTNER
docker exec -it fyp-postgres psql -U postgres -d fyp_db \
  -c "UPDATE users SET role='PARTNER' WHERE username='<username>';"
```

After updating the role, **log out and log in again** so that the JWT token reflects the new role.

### 5.3 End-to-end test scenario

1. Register four accounts (e.g. `donor1`, `initiator1`, `partner1`, `admin1`) and promote them as shown above.
2. Log in as `initiator1` → create a new campaign.
3. Log in as `partner1` → review the campaign and submit an audit result.
4. Log in as `admin1` → approve the campaign from the admin dashboard.
5. Log in as `donor1` → donate to the approved campaign.
6. In the admin dashboard, verify donation records and blockchain hash anchoring.

---

## 6. Stopping and Restarting

### Stop the application services only

```bash
docker compose down
```

### Stop the Fabric test network

```bash
cd fabric/fabric-samples/test-network
./network.sh down
cd ../../..
```

### Full shutdown and cleanup

```bash
docker compose down -v
cd fabric/fabric-samples/test-network && ./network.sh down && cd ../../..
docker network rm fabric_test 2>/dev/null || true
```

### Restart

Simply re-run the one-click script. It detects a healthy Fabric network and skips redeployment when possible.

```bash
./run.sh
```

---

## 7. Verifying the Deployment

```bash
# List running containers (expect fyp-frontend, fyp-backend, fyp-postgres,
# peer0.org1/org2.example.com, orderer.example.com, and three CA containers)
docker ps

# Backend health
curl http://localhost:8080/api/stats/public

# Tail backend logs
docker logs -f fyp-backend
```

---

## 8. Manual Start (Without `run.sh`)

Use this procedure when `run.sh` cannot bring the system up — for example, the Fabric network is stuck, the chaincode is at an inconsistent state

### 8.1 Download the blockchain — `fabric-samples`, binaries, Docker images

```bash
# 1) Pull in the fabric-samples git submodule (the test-network lives here)
git submodule update --init --recursive fabric/fabric-samples

# 2) Download Fabric 2.5.14 binaries AND Hyperledger Docker images
#    Produces:  fabric/fabric-samples/bin/{peer,orderer,configtxgen,...}
#    Pulls:     hyperledger/fabric-peer:2.5.14, fabric-orderer:2.5.14,
#               fabric-ca:1.5.15, fabric-tools:2.5.14, fabric-baseos:2.5.14, ...
cd fabric/fabric-samples
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh \
  | bash -s -- binary docker 2.5.14 1.5.15
cd ../..

# 3) Verify
ls fabric/fabric-samples/bin/peer                              # binary present
docker images | grep -E "hyperledger/fabric-(peer|orderer|ca)" # images present
```

> **If step 8.1-1 fails** (e.g. the project was downloaded as a ZIP and is not a git repository, `.gitmodules` is missing, or `git` cannot reach GitHub), clone `fabric-samples` manually instead — the rest of the steps work identically:
>
> ```bash
> # Clear out any broken/empty placeholder first
> rm -rf fabric/fabric-samples
>
> # Option A: plain git clone (recommended, pins the commit used in this project)
> git clone -b main https://github.com/hyperledger/fabric-samples.git fabric/fabric-samples
>
> # Option B: if GitHub HTTPS is blocked, try SSH
> # git clone -b main git@github.com:hyperledger/fabric-samples.git fabric/fabric-samples
>
> # Option C: no git at all — download a tarball
> # curl -L https://github.com/hyperledger/fabric-samples/archive/refs/heads/main.tar.gz \
> #   | tar -xz -C fabric/ && mv fabric/fabric-samples-main fabric/fabric-samples
>
> # Sanity check: the test-network entry point must exist
> ls fabric/fabric-samples/test-network/network.sh
> ```

> If the Hyperledger Docker images are tagged only with `2.5.14`, tag them as `latest` so `network.sh` can find them:
> ```bash
> for img in hyperledger/fabric-peer hyperledger/fabric-orderer hyperledger/fabric-tools; do
>   docker image inspect ${img}:latest >/dev/null 2>&1 || docker tag ${img}:2.5.14 ${img}:latest
> done
> ```

### 8.2 (Optional) Wipe any previous state

Skip this section on a brand-new machine. Run it only if a previous attempt left stale containers, volumes, or networks:

```bash
docker compose down -v

if [ -f fabric/fabric-samples/test-network/network.sh ]; then
  (cd fabric/fabric-samples/test-network && ./network.sh down)
fi

docker ps -a --format '{{.Names}}' | grep -E "peer|orderer|ca_|cli|dev-peer" | xargs -r docker rm -f
docker network rm fabric_test 2>/dev/null || true
docker volume ls -q | grep -E "^(compose|net|fabric)_" | xargs -r docker volume rm 2>/dev/null || true
rm -f chaincode/.chaincode_version
```

### 8.3 Bring up the Fabric test network

```bash
cd fabric/fabric-samples/test-network

# Generates crypto material, starts peers/orderer/CAs, creates channel "mychannel"
./network.sh up createChannel -c mychannel

cd ../../..

# Confirm the expected containers are running
docker ps --format "table {{.Names}}\t{{.Status}}" \
  | grep -E "peer0\.org1|peer0\.org2|orderer\.example|ca_"
```

Expect `peer0.org1.example.com`, `peer0.org2.example.com`, `orderer.example.com`, and the three CA containers all `Up`.

### 8.4 Deploy the chaincode

`chaincode/deploy.sh` packages, installs on both orgs, approves, commits, and saves the version marker:

```bash
chmod +x chaincode/deploy.sh
./chaincode/deploy.sh smartcontract mychannel

# Verify
docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted \
  --channelID mychannel --name smartcontract
```

Expected output contains `Version: 1.0, Sequence: 1`.

> **If `deploy.sh` fails**, fall back to one of the two alternatives below. Both produce the same committed chaincode.
>
> **Alternative A — use the fabric-samples helper `network.sh deployCC`** (simpler):
>
> ```bash
> cd fabric/fabric-samples/test-network
> ./network.sh deployCC \
>   -c mychannel \
>   -ccn smartcontract \
>   -ccp ../../../chaincode \
>   -ccl go \
>   -ccv 1.0 \
>   -ccs 1
> cd ../../..
> ```
>
> **Alternative B — run the five lifecycle commands by hand** (full control; mirrors what `deploy.sh` does). Execute from the project root:
>
> ```bash
> # Make sure the Fabric binaries in fabric-samples/bin are on PATH
> export PATH="$PWD/fabric/fabric-samples/bin:$PATH"
> export FABRIC_CFG_PATH="$PWD/fabric/fabric-samples/config"
> TN="$PWD/fabric/fabric-samples/test-network"
> ORDERER_CA="$TN/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
>
> use_org1() {
>   export CORE_PEER_TLS_ENABLED=true
>   export CORE_PEER_LOCALMSPID=Org1MSP
>   export CORE_PEER_TLS_ROOTCERT_FILE=$TN/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
>   export CORE_PEER_MSPCONFIGPATH=$TN/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
>   export CORE_PEER_ADDRESS=localhost:7051
> }
> use_org2() {
>   export CORE_PEER_TLS_ENABLED=true
>   export CORE_PEER_LOCALMSPID=Org2MSP
>   export CORE_PEER_TLS_ROOTCERT_FILE=$TN/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
>   export CORE_PEER_MSPCONFIGPATH=$TN/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
>   export CORE_PEER_ADDRESS=localhost:9051
> }
>
> # 1) Package
> use_org1
> peer lifecycle chaincode package /tmp/smartcontract_1.0.tar.gz \
>   --path ./chaincode --lang golang --label smartcontract_1.0
>
> # 2) Install on Org1
> peer lifecycle chaincode install /tmp/smartcontract_1.0.tar.gz
>
> # 3) Install on Org2
> use_org2
> peer lifecycle chaincode install /tmp/smartcontract_1.0.tar.gz
>
> # 4) Approve for both orgs
> use_org1
> PKG_ID=$(peer lifecycle chaincode queryinstalled | grep smartcontract_1.0 | sed 's/.*Package ID: //;s/,.*//')
> peer lifecycle chaincode approveformyorg \
>   -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
>   --channelID mychannel --name smartcontract --version 1.0 \
>   --package-id "$PKG_ID" --sequence 1 --tls --cafile "$ORDERER_CA"
>
> use_org2
> peer lifecycle chaincode approveformyorg \
>   -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
>   --channelID mychannel --name smartcontract --version 1.0 \
>   --package-id "$PKG_ID" --sequence 1 --tls --cafile "$ORDERER_CA"
>
> # 5) Commit
> use_org1
> peer lifecycle chaincode commit \
>   -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
>   --channelID mychannel --name smartcontract --version 1.0 --sequence 1 \
>   --tls --cafile "$ORDERER_CA" \
>   --peerAddresses localhost:7051 \
>   --tlsRootCertFiles $TN/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
>   --peerAddresses localhost:9051 \
>   --tlsRootCertFiles $TN/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
> ```
>
> After either alternative, re-run the verification command above.

### 8.5 Start the backend, frontend, and database

```bash
# Make sure .env exists
[ -f .env ] || cp .env.example .env

# Build and start application services
docker compose up -d --build

# Watch them come up
docker compose ps
docker logs -f fyp-backend
```

When `fyp-backend` reports `Started BackendApplication`, open:

- Frontend — <http://localhost:3000>
- Backend health — <http://localhost:8080/api/stats/public>

### 8.6 Common failures during manual cold-start

| Symptom | Resolution |
| ------- | ---------- |
| `fabric/fabric-samples/` is empty | Run `git submodule update --init --recursive` (step 8.1-1) |
| `bin/peer: No such file or directory` | Re-run the `install-fabric.sh` command in step 8.1-2 |
| `Error response from daemon: No such image: hyperledger/fabric-peer:latest` | Tag the image as `latest` — see the tip box at the end of step 8.1 |
| `./network.sh: Permission denied` | `chmod +x fabric/fabric-samples/test-network/network.sh` |
| `network with name fabric_test already exists` before `network.sh up` | `docker network rm fabric_test`, then retry |
| `Error: error getting endorser client ... connection refused` during deploy | Peers have not finished starting; wait ~10 s and retry `./chaincode/deploy.sh` |
| `Error: chaincode definition not agreed to by this org` | Stale approval cached; repeat from step 8.2 (wipe) and 8.3 |
| Backend logs `UNAVAILABLE: io exception` to `peer0.org1.example.com:7051` | The `fyp-backend` container is not on `fabric_test` — run `docker compose down && docker compose up -d` **after** the Fabric network is up |
| Port conflict on 7050/7051/9051/8080/3000/5432 | Stop the conflicting process or edit port mappings in `docker-compose.yml` |

---
