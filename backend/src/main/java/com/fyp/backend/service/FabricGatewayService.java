package com.fyp.backend.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.InvalidKeyException;
import java.security.PrivateKey;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;

import org.hyperledger.fabric.client.Contract;
import org.hyperledger.fabric.client.Gateway;
import org.hyperledger.fabric.client.identity.Identities;
import org.hyperledger.fabric.client.identity.Identity;
import org.hyperledger.fabric.client.identity.Signer;
import org.hyperledger.fabric.client.identity.Signers;
import org.hyperledger.fabric.client.identity.X509Identity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fyp.backend.config.FabricConfig;

import io.grpc.Grpc;
import io.grpc.ManagedChannel;
import io.grpc.TlsChannelCredentials;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class FabricGatewayService {

    @Autowired
    private FabricConfig fabricConfig;

    private ManagedChannel grpcChannel;
    private Gateway gateway;
    private Contract contract;

    @PostConstruct
    public void init() {
        if (!fabricConfig.isEnabled()) {
            log.info("Fabric integration is disabled");
            return;
        }

        // Validate configuration
        if (fabricConfig.getCertPath() == null || fabricConfig.getCertPath().isEmpty()) {
            log.warn("Fabric is enabled but FABRIC_CERT_PATH is not configured. Disabling Fabric integration.");
            return;
        }
        if (fabricConfig.getKeyPath() == null || fabricConfig.getKeyPath().isEmpty()) {
            log.warn("Fabric is enabled but FABRIC_KEY_PATH is not configured. Disabling Fabric integration.");
            return;
        }
        if (fabricConfig.getTlsCertPath() == null || fabricConfig.getTlsCertPath().isEmpty()) {
            log.warn("Fabric is enabled but FABRIC_TLS_CERT_PATH is not configured. Disabling Fabric integration.");
            return;
        }

        try {
            log.info("Initializing Fabric Gateway connection...");
            log.info("Channel: {}, Chaincode: {}", fabricConfig.getChannelName(), fabricConfig.getChaincodeName());
            log.info("Peer: {}", fabricConfig.getPeerEndpoint());

            // Create gRPC channel
            grpcChannel = newGrpcConnection();

            // Create gateway
            gateway = connectGateway(grpcChannel);

            // Get contract
            var network = gateway.getNetwork(fabricConfig.getChannelName());
            contract = network.getContract(fabricConfig.getChaincodeName());

            log.info("✅ Fabric Gateway initialized successfully");
        } catch (Exception e) {
            log.error("❌ Failed to initialize Fabric Gateway: {}", e.getMessage(), e);
            log.warn("Application will continue without blockchain integration");
            // Don't throw exception - allow app to start without Fabric
        }
    }

    @PreDestroy
    public void cleanup() {
        if (gateway != null) {
            gateway.close();
        }
        if (grpcChannel != null) {
            grpcChannel.shutdownNow();
            try {
                grpcChannel.awaitTermination(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private ManagedChannel newGrpcConnection() throws IOException {
        Path tlsCertPath = Paths.get(fabricConfig.getTlsCertPath());

        if (!Files.exists(tlsCertPath)) {
            throw new IOException("TLS certificate not found at: " + tlsCertPath);
        }

        var credentials = TlsChannelCredentials.newBuilder()
                .trustManager(tlsCertPath.toFile())
                .build();

        log.info("Creating gRPC channel to peer: {} ({})",
                fabricConfig.getPeerEndpoint(), fabricConfig.getPeerHostAlias());

        return Grpc.newChannelBuilder(fabricConfig.getPeerEndpoint(), credentials)
                .overrideAuthority(fabricConfig.getPeerHostAlias())
                .build();
    }

    private Gateway connectGateway(ManagedChannel grpcChannel)
            throws IOException, CertificateException, InvalidKeyException {
        var identity = newIdentity();
        var signer = newSigner();

        return Gateway.newInstance()
                .identity(identity)
                .signer(signer)
                .connection(grpcChannel)
                .evaluateOptions(options -> options.withDeadlineAfter(5, TimeUnit.SECONDS))
                .endorseOptions(options -> options.withDeadlineAfter(15, TimeUnit.SECONDS))
                .submitOptions(options -> options.withDeadlineAfter(5, TimeUnit.SECONDS))
                .commitStatusOptions(options -> options.withDeadlineAfter(1, TimeUnit.MINUTES))
                .connect();
    }

    private Identity newIdentity() throws IOException, CertificateException {
        Path certPath = resolveCertPath(Paths.get(fabricConfig.getCertPath()));
        X509Certificate certificate = readX509Certificate(certPath);
        log.info("Loaded identity certificate for MSP: {}", fabricConfig.getMspId());
        return new X509Identity(fabricConfig.getMspId(), certificate);
    }

    /**
     * Resolves the certificate path. Supports both file and directory paths.
     * If path is a directory, finds the first .pem file inside it.
     * If path is a file that doesn't exist, scans its parent directory for any .pem file.
     * This handles Fabric's varying cert filenames across versions (cert.pem vs Admin@org-cert.pem).
     */
    static Path resolveCertPath(Path certPath) throws IOException {
        if (Files.isDirectory(certPath)) {
            try (var files = Files.list(certPath)) {
                return files
                        .filter(Files::isRegularFile)
                        .filter(p -> p.getFileName().toString().endsWith(".pem"))
                        .findFirst()
                        .orElseThrow(() -> new IOException(
                                "No .pem certificate file found in directory: " + certPath));
            }
        }

        if (Files.exists(certPath)) {
            return certPath;
        }

        Path parent = certPath.getParent();
        if (parent != null && Files.isDirectory(parent)) {
            try (var files = Files.list(parent)) {
                return files
                        .filter(Files::isRegularFile)
                        .filter(p -> p.getFileName().toString().endsWith(".pem"))
                        .findFirst()
                        .orElseThrow(() -> new IOException(
                                "Certificate not found at: " + certPath
                                + " and no .pem file in " + parent));
            }
        }

        throw new IOException("Certificate not found at: " + certPath);
    }

    private Signer newSigner() throws IOException, InvalidKeyException {
        Path keyPath = Paths.get(fabricConfig.getKeyPath());

        if (!Files.exists(keyPath)) {
            throw new IOException("Private key not found at: " + keyPath);
        }

        // If keyPath is a directory (keystore folder), find the first private key file
        Path actualKeyPath = keyPath;
        if (Files.isDirectory(keyPath)) {
            final Path keystoreDir = keyPath;
            try (var files = Files.list(keystoreDir)) {
                actualKeyPath = files
                        .filter(Files::isRegularFile)
                        .filter(p -> p.getFileName().toString().endsWith("_sk"))
                        .findFirst()
                        .orElseThrow(
                                () -> new IOException(
                                        "No private key file found in keystore directory: " + keystoreDir));
                log.info("Using private key file: {}", actualKeyPath.getFileName());
            }
        }

        PrivateKey privateKey = readPrivateKey(actualKeyPath);
        log.info("Loaded private key for signing");
        return Signers.newPrivateKeySigner(privateKey);
    }

    private X509Certificate readX509Certificate(Path certificatePath) throws IOException, CertificateException {
        try (var certReader = Files.newBufferedReader(certificatePath)) {
            return Identities.readX509Certificate(certReader);
        }
    }

    private PrivateKey readPrivateKey(Path keyPath) throws IOException, InvalidKeyException {
        try (var keyReader = Files.newBufferedReader(keyPath)) {
            return Identities.readPrivateKey(keyReader);
        }
    }

    // ==================== Campaign Functions ====================

    /**
     * Create a campaign on the blockchain with minimal trusted state.
     * The chaincode generates the campaign ID from the Fabric transaction ID.
     *
     * @return the campaignID generated by the chaincode (Fabric txID)
     */
    public String createCampaign(String initiator,
            double goalAmount, String auditor, String deadline, String dataHash) {
        if (!isEnabled()) {
            log.debug("Fabric is disabled or not initialized, skipping blockchain operation");
            return null;
        }

        try {
            String createdAt = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

            byte[] result = contract.submitTransaction("CreateCampaign",
                    initiator, createdAt, String.valueOf(goalAmount),
                    auditor != null ? auditor : "",
                    deadline != null ? deadline : "",
                    dataHash);

            String campaignID = new String(result, StandardCharsets.UTF_8);
            log.info("Campaign created on blockchain with txID: {}", campaignID);
            return campaignID;
        } catch (Exception e) {
            log.error("Failed to create campaign on blockchain: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create campaign on blockchain: " + e.getMessage(), e);
        }
    }

    /**
     * Read campaign from blockchain
     * 从区块链读取项目信息
     */
    public String readCampaign(String campaignID) {
        if (!isEnabled()) {
            return null;
        }

        try {
            byte[] result = contract.evaluateTransaction("ReadCampaign", campaignID);
            return new String(result, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to read campaign from blockchain: {}", e.getMessage());
            throw new RuntimeException("Failed to read campaign from blockchain: " + e.getMessage(), e);
        }
    }

    /**
     * Update campaign status on blockchain
     * 更新区块链上的项目状态
     */
    public void updateCampaignStatus(String campaignID, String newStatus) {
        if (!isEnabled()) {
            return;
        }

        try {
            contract.submitTransaction("UpdateCampaignStatus", campaignID, newStatus);
            log.info("Campaign status updated on blockchain: {} -> {}", campaignID, newStatus);
        } catch (Exception e) {
            log.error("Failed to update campaign status on blockchain: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update campaign status: " + e.getMessage(), e);
        }
    }

    // ==================== Donation Functions ====================

    /**
     * Create a donation record on blockchain with minimal evidence.
     * The chaincode generates the donation ID from the Fabric transaction ID.
     *
     * @return the donationID generated by the chaincode (Fabric txID)
     */
    public String createDonation(String campaignID, double amount,
            String donorHash, String paymentRefHash) {
        if (!isEnabled()) {
            return null;
        }

        try {
            String donatedAt = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

            byte[] result = contract.submitTransaction("CreateDonation",
                    campaignID,
                    String.valueOf(amount),
                    donorHash,
                    donatedAt,
                    paymentRefHash != null ? paymentRefHash : "");

            String donationID = new String(result, StandardCharsets.UTF_8);
            log.info("Donation created on blockchain with txID: {} for campaign {}", donationID, campaignID);
            return donationID;
        } catch (Exception e) {
            log.error("Failed to create donation on blockchain: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create donation on blockchain: " + e.getMessage(), e);
        }
    }

    /**
     * Read donation from blockchain
     * 从区块链读取捐款记录
     */
    public String readDonation(String donationID) {
        if (!isEnabled()) {
            return null;
        }

        try {
            byte[] result = contract.evaluateTransaction("ReadDonation", donationID);
            return new String(result, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to read donation from blockchain: {}", e.getMessage());
            throw new RuntimeException("Failed to read donation from blockchain: " + e.getMessage(), e);
        }
    }

    /**
     * Record a third-party review conclusion on the blockchain.
     * Human-readable text lives off-chain; commentHash anchors it.
     */
    public String recordAudit(String campaignID, String reviewerOrg, String conclusion,
                              String evidenceHash, String commentHash, String timestamp) {
        if (!isEnabled()) {
            log.warn("Fabric not enabled, skipping audit recording for campaign {}", campaignID);
            return null;
        }
        try {
            byte[] result = contract.submitTransaction(
                    "RecordAudit",
                    campaignID, reviewerOrg, conclusion,
                    evidenceHash != null ? evidenceHash : "",
                    commentHash != null ? commentHash : "",
                    timestamp);
            return new String(result, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to record audit on blockchain: {}", e.getMessage());
            throw new RuntimeException("Failed to record audit on blockchain: " + e.getMessage(), e);
        }
    }

    /**
     * Calls ApproveCampaign() on the chaincode using Org1MSP credentials.
     * The chaincode enforces:
     *   1. Caller MSP == Org1MSP
     *   2. Latest review conclusion == APPROVED (submitted by Org2MSP)
     */
    public void approveCampaign(String campaignID, String approvedBy, String timestamp) {
        if (!isEnabled()) {
            log.warn("Fabric not enabled — skipping ApproveCampaign for campaign {}", campaignID);
            return;
        }
        try {
            contract.submitTransaction("ApproveCampaign", campaignID, approvedBy, timestamp);
            log.info("ApproveCampaign OK — campaign {}", campaignID);
        } catch (Exception e) {
            log.error("ApproveCampaign failed for {}: {}", campaignID, e.getMessage());
            throw new RuntimeException("Blockchain ApproveCampaign failed: " + e.getMessage(), e);
        }
    }

    /** Calls QueryReviews() (open to all MSPs) via Org1 gateway. */
    public String queryReviews(String campaignID) {
        if (!isEnabled()) return null;
        try {
            byte[] result = contract.evaluateTransaction("QueryReviews", campaignID);
            return new String(result, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("QueryReviews failed for {}: {}", campaignID, e.getMessage());
            return null;
        }
    }

    /** Calls GetApprovalRecord() to check on-chain approval status. */
    public String getApprovalRecord(String campaignID) {
        if (!isEnabled()) return null;
        try {
            byte[] result = contract.evaluateTransaction("GetApprovalRecord", campaignID);
            return new String(result, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("GetApprovalRecord failed for {}: {}", campaignID, e.getMessage());
            return null;
        }
    }

    /** Retrieve the latest audit record for a campaign from the ledger. */
    public String getLatestAuditRecord(String campaignID) {
        if (!isEnabled()) return null;
        try {
            byte[] result = contract.evaluateTransaction("GetLatestAuditRecord", campaignID);
            return new String(result, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("Could not fetch latest audit record for {}: {}", campaignID, e.getMessage());
            return null;
        }
    }

    /** Read campaign state from ledger (includes status, amounts). */
    public String readCampaignOnChain(String campaignID) {
        if (!isEnabled()) return null;
        try {
            byte[] result = contract.evaluateTransaction("ReadCampaign", campaignID);
            return new String(result, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("Could not read on-chain campaign {}: {}", campaignID, e.getMessage());
            return null;
        }
    }

    // ==================== Campaign Update & History ====================

    /**
     * Update campaign details on blockchain with version tracking.
     * The chaincode bumps the version and archives the old state as CampaignHistory.
     */
    public void updateCampaign(String campaignID, double newGoalAmount,
                               String newAuditor, String newDeadline, String newDataHash) {
        if (!isEnabled()) return;
        try {
            contract.submitTransaction("UpdateCampaign",
                    campaignID,
                    String.valueOf(newGoalAmount),
                    newAuditor != null ? newAuditor : "",
                    newDeadline != null ? newDeadline : "",
                    newDataHash);
            log.info("Campaign updated on blockchain: {}", campaignID);
        } catch (Exception e) {
            log.error("Failed to update campaign on blockchain: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update campaign on blockchain: " + e.getMessage(), e);
        }
    }

    // ==================== Disbursement Functions ====================

    /**
     * Record a fund disbursement on blockchain (Org1MSP only).
     *
     * @return the disbursementID generated by the chaincode
     */
    public String recordDisbursement(String campaignID, double amount,
                                     String recipientHash, String paymentHash, String timestamp) {
        if (!isEnabled()) return null;
        try {
            byte[] result = contract.submitTransaction("RecordDisbursement",
                    campaignID,
                    String.valueOf(amount),
                    recipientHash,
                    paymentHash,
                    timestamp);
            String disbursementId = new String(result, StandardCharsets.UTF_8);
            log.info("Disbursement recorded on blockchain: {} for campaign {}", disbursementId, campaignID);
            return disbursementId;
        } catch (Exception e) {
            log.error("Failed to record disbursement on blockchain: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to record disbursement: " + e.getMessage(), e);
        }
    }

    /**
     * Returns the Fabric network object for direct QSCC queries.
     * Used by FabricAdminService and PartnerProfileService for block info.
     */
    public org.hyperledger.fabric.client.Network getNetwork() {
        if (gateway == null) return null;
        return gateway.getNetwork(fabricConfig.getChannelName());
    }

    /**
     * Check if Fabric integration is enabled and ready
     */
    public boolean isEnabled() {
        return fabricConfig.isEnabled() && gateway != null && contract != null;
    }
}
