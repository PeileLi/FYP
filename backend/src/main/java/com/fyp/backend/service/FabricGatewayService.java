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
        Path certPath = Paths.get(fabricConfig.getCertPath());

        if (!Files.exists(certPath)) {
            throw new IOException("Certificate not found at: " + certPath);
        }

        X509Certificate certificate = readX509Certificate(certPath);
        log.info("Loaded identity certificate for MSP: {}", fabricConfig.getMspId());
        return new X509Identity(fabricConfig.getMspId(), certificate);
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
     * Create a new campaign on the blockchain
     * 在区块链上创建新的捐款项目
     * 
     * @return Transaction ID (composite key: campaignID_timestamp) for blockchain
     *         verification
     */
    public String createCampaign(String campaignID, String title, String description, String category, String initiator, double goalAmount) {
        if (!isEnabled()) {
            log.debug("Fabric is disabled or not initialized, skipping blockchain operation");
            return null;
        }

        try {
            String createdAt = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            String auditor = ""; // Empty auditor to trigger AUTO_APPROVED

            contract.submitTransaction("CreateCampaign",
                    campaignID, title, description, category, initiator, createdAt, String.valueOf(goalAmount), auditor);

            // Generate a blockchain certificate ID using campaign ID and timestamp
            // Use "::" separator so that campaignID (which may contain "_") can be decoded correctly
            String timestamp = String.valueOf(System.currentTimeMillis());
            String compositeKey = campaignID + "::" + timestamp;
            String txId = "BC" + bytesToHex(compositeKey.getBytes());

            log.info("Campaign created on blockchain: {} with Certificate ID: {}", campaignID, txId);
            return txId;
        } catch (Exception e) {
            log.error("Failed to create campaign on blockchain: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create campaign on blockchain: " + e.getMessage(), e);
        }
    }

    /**
     * Convert byte array to hex string
     */
    private String bytesToHex(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
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
     * Create a new donation record on blockchain
     * 在区块链上创建新的捐款记录
     */
    public void createDonation(String donationID, String campaignID, double amount, String donor, String displayName, boolean isAnonymous) {
        if (!isEnabled()) {
            return;
        }

        try {
            String donatedAt = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

            contract.submitTransaction("CreateDonation",
                    donationID, 
                    campaignID, 
                    String.valueOf(amount), 
                    donor, 
                    displayName,
                    String.valueOf(isAnonymous),
                    donatedAt);

            log.info("Donation created on blockchain: {} for campaign {} (Display: {}, Anonymous: {})", 
                    donationID, campaignID, displayName, isAnonymous);
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
     * Check if Fabric integration is enabled and ready
     */
    public boolean isEnabled() {
        return fabricConfig.isEnabled() && gateway != null && contract != null;
    }
}
