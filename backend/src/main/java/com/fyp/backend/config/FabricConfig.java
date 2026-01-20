package com.fyp.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Configuration
@ConfigurationProperties(prefix = "fabric")
@Data
public class FabricConfig {
    private String networkConfigPath;
    private String channelName = "mychannel";
    private String chaincodeName = "donation";
    private String mspId = "Org1MSP";
    private String certPath;
    private String keyPath;
    private String tlsCertPath;
    private String peerEndpoint = "localhost:7051";
    private String peerHostAlias = "peer0.org1.example.com";
    private boolean enabled = false; // Fabric integration disabled by default
}
