package com.fyp.backend.service;

import com.fyp.backend.config.FabricConfig;
import io.grpc.Grpc;
import io.grpc.ManagedChannel;
import io.grpc.TlsChannelCredentials;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.hyperledger.fabric.client.Contract;
import org.hyperledger.fabric.client.Gateway;
import org.hyperledger.fabric.client.identity.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.InvalidKeyException;
import java.security.PrivateKey;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.concurrent.TimeUnit;

/**
 * Gateway service that connects to the Hyperledger Fabric network using
 * Org2MSP (third-party auditor organisation) credentials.
 *
 * Only transactions signed by this service carry the Org2MSP identity, which
 * is required by the chaincode's MSP gate on SubmitReviewResult().
 *
 * Falls back to a no-op mode if Org2 credentials are not configured, allowing
 * the application to start in environments without Fabric.
 */
@Service
@Slf4j
public class PartnerFabricGatewayService {

    @Autowired
    private FabricConfig fabricConfig;

    private ManagedChannel grpcChannel;
    private Gateway gateway;
    private Contract contract;
    private boolean org2Ready = false;

    @PostConstruct
    public void init() {
        if (!fabricConfig.isEnabled()) {
            log.info("[PartnerFabric] Fabric integration is disabled — Org2 gateway not started");
            return;
        }
        if (fabricConfig.getOrg2CertPath() == null || fabricConfig.getOrg2CertPath().isBlank()) {
            log.warn("[PartnerFabric] FABRIC_ORG2_CERT_PATH not configured — Org2 gateway not started. " +
                     "SubmitReviewResult calls will fall back to Org1 (RecordAudit).");
            return;
        }

        try {
            log.info("[PartnerFabric] Initialising Org2 Gateway ({})...", fabricConfig.getOrg2MspId());
            grpcChannel = buildGrpcChannel();
            gateway     = buildGateway(grpcChannel);
            var network = gateway.getNetwork(fabricConfig.getChannelName());
            contract    = network.getContract(fabricConfig.getChaincodeName());
            org2Ready   = true;
            log.info("[PartnerFabric] ✅ Org2 Gateway ready — MSP: {}, Peer: {}",
                     fabricConfig.getOrg2MspId(), fabricConfig.getOrg2PeerEndpoint());
        } catch (Exception e) {
            log.error("[PartnerFabric] ❌ Failed to initialise Org2 Gateway: {}", e.getMessage());
            log.warn("[PartnerFabric] Continuing without Org2 blockchain integration");
        }
    }

    @PreDestroy
    public void cleanup() {
        if (gateway != null) { try { gateway.close(); } catch (Exception ignored) {} }
        if (grpcChannel != null) {
            grpcChannel.shutdownNow();
            try { grpcChannel.awaitTermination(5, TimeUnit.SECONDS); } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public boolean isOrg2Ready() { return org2Ready; }

    /**
     * Calls the chaincode's SubmitReviewResult() function, which enforces:
     *   ctx.GetClientIdentity().GetMSPID() == "Org2MSP"
     *
     * Returns the generated auditID string, or null if Org2 is not available
     * (caller should fall back to RecordAudit via Org1 with a warning).
     */
    public String submitReviewResult(String campaignID, String reviewerOrg, String conclusion,
                                     String evidenceHash, String commentHash, String timestamp) {
        if (!org2Ready) {
            log.warn("[PartnerFabric] Org2 gateway not ready — cannot call SubmitReviewResult for campaign {}. " +
                     "Configure FABRIC_ORG2_* env vars to enable MSP-gated audit submission.", campaignID);
            return null;
        }
        try {
            byte[] result = contract.submitTransaction(
                    "SubmitReviewResult",
                    campaignID, reviewerOrg, conclusion,
                    evidenceHash  != null ? evidenceHash  : "",
                    commentHash   != null ? commentHash   : "",
                    timestamp);
            String auditId = new String(result, java.nio.charset.StandardCharsets.UTF_8);
            log.info("[PartnerFabric] SubmitReviewResult OK — auditId={}, campaign={}, MSP={}",
                     auditId, campaignID, fabricConfig.getOrg2MspId());
            return auditId;
        } catch (Exception e) {
            log.error("[PartnerFabric] SubmitReviewResult failed for campaign {}: {}", campaignID, e.getMessage());
            throw new RuntimeException("Blockchain SubmitReviewResult failed: " + e.getMessage(), e);
        }
    }

    /**
     * Calls QueryReviews() (open to any MSP — uses Org2 identity here as it is
     * available; could equally be called via Org1 gateway).
     */
    public String queryReviews(String campaignID) {
        if (!org2Ready) return null;
        try {
            byte[] result = contract.evaluateTransaction("QueryReviews", campaignID);
            return new String(result, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("[PartnerFabric] QueryReviews failed for {}: {}", campaignID, e.getMessage());
            return null;
        }
    }

    // ── Internal connection helpers ───────────────────────────────────────────

    private ManagedChannel buildGrpcChannel() throws IOException {
        Path tlsCert = Paths.get(fabricConfig.getOrg2TlsCertPath());
        if (!Files.exists(tlsCert)) {
            throw new IOException("[PartnerFabric] Org2 TLS cert not found at: " + tlsCert);
        }
        var credentials = TlsChannelCredentials.newBuilder().trustManager(tlsCert.toFile()).build();
        return Grpc.newChannelBuilder(fabricConfig.getOrg2PeerEndpoint(), credentials)
                   .overrideAuthority(fabricConfig.getOrg2PeerHostAlias())
                   .build();
    }

    private Gateway buildGateway(ManagedChannel channel)
            throws IOException, CertificateException, InvalidKeyException {
        return Gateway.newInstance()
                .identity(buildIdentity())
                .signer(buildSigner())
                .connection(channel)
                .evaluateOptions(o -> o.withDeadlineAfter(5,  TimeUnit.SECONDS))
                .endorseOptions(o  -> o.withDeadlineAfter(15, TimeUnit.SECONDS))
                .submitOptions(o   -> o.withDeadlineAfter(5,  TimeUnit.SECONDS))
                .commitStatusOptions(o -> o.withDeadlineAfter(1, TimeUnit.MINUTES))
                .connect();
    }

    private Identity buildIdentity() throws IOException, CertificateException {
        Path certPath = Paths.get(fabricConfig.getOrg2CertPath());
        if (!Files.exists(certPath)) {
            throw new IOException("[PartnerFabric] Org2 cert not found at: " + certPath);
        }
        try (var reader = Files.newBufferedReader(certPath)) {
            X509Certificate cert = Identities.readX509Certificate(reader);
            return new X509Identity(fabricConfig.getOrg2MspId(), cert);
        }
    }

    private Signer buildSigner() throws IOException, InvalidKeyException {
        Path keyPath = Paths.get(fabricConfig.getOrg2KeyPath());
        if (!Files.exists(keyPath)) {
            throw new IOException("[PartnerFabric] Org2 key not found at: " + keyPath);
        }
        Path actualKey = keyPath;
        if (Files.isDirectory(keyPath)) {
            try (var files = Files.list(keyPath)) {
                actualKey = files.filter(Files::isRegularFile)
                                 .filter(p -> p.getFileName().toString().endsWith("_sk"))
                                 .findFirst()
                                 .orElseThrow(() -> new IOException(
                                         "[PartnerFabric] No _sk file in Org2 keystore: " + keyPath));
            }
        }
        try (var reader = Files.newBufferedReader(actualKey)) {
            PrivateKey key = Identities.readPrivateKey(reader);
            return Signers.newPrivateKeySigner(key);
        }
    }
}
