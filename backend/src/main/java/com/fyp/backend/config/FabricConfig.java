package com.fyp.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Configuration
@ConfigurationProperties(prefix = "fabric")
@Data
public class FabricConfig {
    // ── Org1 (Platform) credentials ───────────────────────────────────────────
    private String networkConfigPath;
    private String channelName = "mychannel";
    private String chaincodeName = "donation";
    private String mspId = "Org1MSP";
    private String certPath;
    private String keyPath;
    private String tlsCertPath;
    private String peerEndpoint = "peer0.org1.example.com:7051";
    private String peerHostAlias = "peer0.org1.example.com";
    private boolean enabled = false;

    // ── Org2 (Third-party auditor) credentials ────────────────────────────────
    // Used to submit SubmitReviewResult() chaincode calls; only Org2MSP-signed
    // transactions are accepted by the MSP gate in the chaincode.
    private String org2MspId = "Org2MSP";
    private String org2CertPath;
    private String org2KeyPath;
    private String org2TlsCertPath;
    private String org2PeerEndpoint = "peer0.org2.example.com:9051";
    private String org2PeerHostAlias = "peer0.org2.example.com";
}
