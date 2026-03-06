package main

import (
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// ── World-state key generators ────────────────────────────────────────────────

func campaignKey(campaignID string) string {
	return "CAMPAIGN_" + campaignID
}

func donationKey(donationID string) string {
	return "DONATION_" + donationID
}

func historyKey(campaignID string, version int) string {
	return "HISTORY_" + campaignID + "_V" + strconv.Itoa(version)
}

func auditKey(campaignID string, seq int) string {
	return "AUDIT_" + campaignID + "_" + strconv.Itoa(seq)
}

func latestAuditSeqKey(campaignID string) string {
	return "AUDIT_SEQ_" + campaignID
}

func approvalKey(campaignID string) string {
	return "APPROVAL_" + campaignID
}

func disbursementKey(campaignID string, seq int) string {
	return "DISB_" + campaignID + "_" + strconv.Itoa(seq)
}

func latestDisbSeqKey(campaignID string) string {
	return "DISB_SEQ_" + campaignID
}

// ── Validation helpers ────────────────────────────────────────────────────────

// validateDataHash rejects obviously invalid hash values. The actual hash is
// computed by the backend from off-chain detail fields; the chaincode only
// stores it as a trust anchor.
func validateDataHash(h string) error {
	if len(h) != 64 {
		return fmt.Errorf("dataHash must be a 64-char hex string (SHA-256), got length %d", len(h))
	}
	return nil
}

// ── MSP identity helpers ──────────────────────────────────────────────────────

// getCallerMSPID retrieves the MSP ID of the transaction submitter.
func getCallerMSPID(ctx contractapi.TransactionContextInterface) (string, error) {
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return "", fmt.Errorf("failed to retrieve caller MSPID: %v", err)
	}
	return mspID, nil
}

// requireMSP asserts that the caller belongs to the expected MSP; returns an
// informative error if not.
func requireMSP(ctx contractapi.TransactionContextInterface, required string) error {
	mspID, err := getCallerMSPID(ctx)
	if err != nil {
		return err
	}
	if mspID != required {
		return fmt.Errorf("access denied: this function requires MSP=%s, caller has MSP=%s", required, mspID)
	}
	return nil
}
