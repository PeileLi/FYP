package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// RecordAudit records a third-party review conclusion on-chain.
// Detail text (summary, notes) lives off-chain; commentHash anchors it.
func (s *SmartContract) RecordAudit(ctx contractapi.TransactionContextInterface,
	campaignID string, reviewerOrg string, conclusion string,
	evidenceHash string, commentHash string, timestamp string) (string, error) {

	validConclusions := map[string]bool{
		"APPROVED": true, "REJECTED": true, "REQUIRES_INFO": true, "RISK_FLAGGED": true,
	}
	if !validConclusions[conclusion] {
		return "", fmt.Errorf("invalid conclusion: %s. Must be APPROVED, REJECTED, REQUIRES_INFO, or RISK_FLAGGED", conclusion)
	}

	exists, err := s.CampaignExists(ctx, campaignID)
	if err != nil {
		return "", err
	}
	if !exists {
		return "", fmt.Errorf("campaign %s does not exist", campaignID)
	}

	seqBytes, err := ctx.GetStub().GetState(latestAuditSeqKey(campaignID))
	if err != nil {
		return "", fmt.Errorf("failed to read audit sequence: %v", err)
	}
	seq := 1
	if seqBytes != nil {
		seq, err = strconv.Atoi(string(seqBytes))
		if err != nil {
			return "", fmt.Errorf("failed to parse sequence: %v", err)
		}
		seq++
	}

	callerMSP, _ := getCallerMSPID(ctx)

	auditID := "AUDIT_" + campaignID + "_" + strconv.Itoa(seq)
	record := AuditRecord{
		AuditID:      auditID,
		CampaignID:   campaignID,
		ReviewerOrg:  reviewerOrg,
		CallerMSP:    callerMSP,
		Conclusion:   conclusion,
		EvidenceHash: evidenceHash,
		CommentHash:  commentHash,
		Timestamp:    timestamp,
	}

	data, err := json.Marshal(record)
	if err != nil {
		return "", fmt.Errorf("failed to marshal audit record: %v", err)
	}
	if err := ctx.GetStub().PutState(auditKey(campaignID, seq), data); err != nil {
		return "", fmt.Errorf("failed to store audit record: %v", err)
	}
	if err := ctx.GetStub().PutState(latestAuditSeqKey(campaignID), []byte(strconv.Itoa(seq))); err != nil {
		return "", fmt.Errorf("failed to update sequence: %v", err)
	}

	campData, _ := ctx.GetStub().GetState(campaignKey(campaignID))
	if campData != nil {
		var camp Campaign
		if err := json.Unmarshal(campData, &camp); err == nil {
			camp.Auditor = reviewerOrg
			camp.LastUpdated = timestamp
			if conclusion == "RISK_FLAGGED" || conclusion == "REJECTED" {
				camp.Status = StatusSuspended
			}
			if updated, err := json.Marshal(camp); err == nil {
				_ = ctx.GetStub().PutState(campaignKey(campaignID), updated)
			}
		}
	}

	return auditID, nil
}

// ── MSP-gated audit functions ─────────────────────────────────────────────────

// SubmitReviewResult records a third-party review conclusion on the ledger.
// ACCESS CONTROL: Only Org2MSP (ThirdPartyMSPID) may call this function.
func (s *SmartContract) SubmitReviewResult(ctx contractapi.TransactionContextInterface,
	campaignID string, reviewerOrg string, conclusion string,
	evidenceHash string, commentHash string, timestamp string) (string, error) {

	mspID, err := getCallerMSPID(ctx)
	if err != nil {
		return "", err
	}
	if mspID != ThirdPartyMSPID {
		return "", fmt.Errorf("access denied: SubmitReviewResult requires MSP=%s, got MSP=%s",
			ThirdPartyMSPID, mspID)
	}

	validConclusions := map[string]bool{
		"APPROVED": true, "REJECTED": true, "REQUIRES_INFO": true, "RISK_FLAGGED": true,
	}
	if !validConclusions[conclusion] {
		return "", fmt.Errorf("invalid conclusion: %s", conclusion)
	}

	exists, err := s.CampaignExists(ctx, campaignID)
	if err != nil {
		return "", err
	}
	if !exists {
		return "", fmt.Errorf("campaign %s does not exist", campaignID)
	}

	seqBytes, err := ctx.GetStub().GetState(latestAuditSeqKey(campaignID))
	if err != nil {
		return "", fmt.Errorf("failed to read audit sequence: %v", err)
	}
	seq := 1
	if seqBytes != nil {
		seq, _ = strconv.Atoi(string(seqBytes))
		seq++
	}

	auditID := "AUDIT_" + campaignID + "_" + strconv.Itoa(seq)
	record := AuditRecord{
		AuditID:      auditID,
		CampaignID:   campaignID,
		ReviewerOrg:  reviewerOrg,
		CallerMSP:    mspID,
		Conclusion:   conclusion,
		EvidenceHash: evidenceHash,
		CommentHash:  commentHash,
		Timestamp:    timestamp,
	}

	data, err := json.Marshal(record)
	if err != nil {
		return "", fmt.Errorf("failed to marshal review result: %v", err)
	}
	if err := ctx.GetStub().PutState(auditKey(campaignID, seq), data); err != nil {
		return "", fmt.Errorf("failed to store review result: %v", err)
	}
	if err := ctx.GetStub().PutState(latestAuditSeqKey(campaignID), []byte(strconv.Itoa(seq))); err != nil {
		return "", fmt.Errorf("failed to update audit sequence: %v", err)
	}

	campData, _ := ctx.GetStub().GetState(campaignKey(campaignID))
	if campData != nil {
		var camp Campaign
		if err := json.Unmarshal(campData, &camp); err == nil {
			camp.Auditor = reviewerOrg
			camp.LastUpdated = timestamp
			if conclusion == "RISK_FLAGGED" || conclusion == "REJECTED" {
				camp.Status = StatusSuspended
			}
			if updated, err := json.Marshal(camp); err == nil {
				_ = ctx.GetStub().PutState(campaignKey(campaignID), updated)
			}
		}
	}

	_ = ctx.GetStub().SetEvent("ReviewSubmitted", []byte(
		fmt.Sprintf(`{"auditId":"%s","campaignId":"%s","conclusion":"%s","callerMsp":"%s"}`,
			auditID, campaignID, conclusion, mspID)))

	return auditID, nil
}

// ApproveCampaign transitions a campaign's on-chain status from PENDING_REVIEW to
// IN_PROGRESS.  Two invariants are enforced:
//  1. Only the platform organisation (PlatformMSPID / Org1MSP) may call this function.
//  2. The latest review record for the campaign must have conclusion == "APPROVED".
//     This ensures the platform cannot approve a campaign that has not been cleared by
//     the third-party auditor — the audit gate is enforced in chaincode, not just
//     in the application layer.
func (s *SmartContract) ApproveCampaign(ctx contractapi.TransactionContextInterface,
	campaignID string, approvedBy string, timestamp string) error {

	if err := requireMSP(ctx, PlatformMSPID); err != nil {
		return fmt.Errorf("ApproveCampaign: %v", err)
	}

	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return err
	}

	latestAudit, err := s.GetLatestAuditRecord(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to read latest audit record: %v", err)
	}
	if latestAudit == nil {
		return fmt.Errorf("approval denied: campaign %s has no third-party review record. "+
			"A third-party org must submit an APPROVED review before the platform can approve.", campaignID)
	}
	if latestAudit.Conclusion != "APPROVED" {
		return fmt.Errorf("approval denied: latest review conclusion for campaign %s is %s "+
			"(must be APPROVED). Issued by %s [%s].",
			campaignID, latestAudit.Conclusion, latestAudit.ReviewerOrg, latestAudit.CallerMSP)
	}

	campaign.Status = StatusInProgress
	campaign.Auditor = approvedBy
	campaign.LastUpdated = timestamp

	data, err := json.Marshal(campaign)
	if err != nil {
		return fmt.Errorf("failed to marshal campaign: %v", err)
	}
	if err := ctx.GetStub().PutState(campaignKey(campaignID), data); err != nil {
		return fmt.Errorf("failed to save approved campaign: %v", err)
	}

	mspID, _ := getCallerMSPID(ctx)
	approval := CampaignApprovalRecord{
		CampaignID:    campaignID,
		ApprovedBy:    approvedBy,
		CallerMSP:     mspID,
		ReviewAuditID: latestAudit.AuditID,
		Timestamp:     timestamp,
	}
	approvalData, err := json.Marshal(approval)
	if err != nil {
		return fmt.Errorf("failed to marshal approval record: %v", err)
	}
	if err := ctx.GetStub().PutState(approvalKey(campaignID), approvalData); err != nil {
		return fmt.Errorf("failed to store approval record: %v", err)
	}

	_ = ctx.GetStub().SetEvent("CampaignApproved", []byte(
		fmt.Sprintf(`{"campaignId":"%s","approvedBy":"%s","reviewAuditId":"%s"}`,
			campaignID, approvedBy, latestAudit.AuditID)))

	return nil
}

// ── Audit query functions ─────────────────────────────────────────────────────

// QueryReviews returns all audit records for a campaign.
// ACCESS CONTROL: Open — any enrolled identity on the channel may query.
func (s *SmartContract) QueryReviews(ctx contractapi.TransactionContextInterface,
	campaignID string) ([]*AuditRecord, error) {

	seqBytes, err := ctx.GetStub().GetState(latestAuditSeqKey(campaignID))
	if err != nil {
		return nil, fmt.Errorf("failed to read audit sequence: %v", err)
	}
	if seqBytes == nil {
		return []*AuditRecord{}, nil
	}
	maxSeq, _ := strconv.Atoi(string(seqBytes))

	var records []*AuditRecord
	for i := 1; i <= maxSeq; i++ {
		data, err := ctx.GetStub().GetState(auditKey(campaignID, i))
		if err != nil || data == nil {
			continue
		}
		var r AuditRecord
		if err := json.Unmarshal(data, &r); err == nil {
			records = append(records, &r)
		}
	}
	return records, nil
}

// GetApprovalRecord retrieves the approval record for a campaign (if it exists).
func (s *SmartContract) GetApprovalRecord(ctx contractapi.TransactionContextInterface,
	campaignID string) (*CampaignApprovalRecord, error) {

	data, err := ctx.GetStub().GetState(approvalKey(campaignID))
	if err != nil {
		return nil, fmt.Errorf("failed to read approval record: %v", err)
	}
	if data == nil {
		return nil, nil
	}
	var record CampaignApprovalRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, fmt.Errorf("failed to unmarshal approval record: %v", err)
	}
	return &record, nil
}

// GetLatestAuditRecord retrieves the most recent audit record for a campaign.
func (s *SmartContract) GetLatestAuditRecord(ctx contractapi.TransactionContextInterface,
	campaignID string) (*AuditRecord, error) {

	seqBytes, err := ctx.GetStub().GetState(latestAuditSeqKey(campaignID))
	if err != nil {
		return nil, fmt.Errorf("failed to read audit sequence: %v", err)
	}
	if seqBytes == nil {
		return nil, nil
	}
	seq, err := strconv.Atoi(string(seqBytes))
	if err != nil {
		return nil, fmt.Errorf("invalid sequence: %v", err)
	}

	data, err := ctx.GetStub().GetState(auditKey(campaignID, seq))
	if err != nil {
		return nil, fmt.Errorf("failed to read audit record: %v", err)
	}
	if data == nil {
		return nil, nil
	}

	var record AuditRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, fmt.Errorf("failed to unmarshal audit record: %v", err)
	}
	return &record, nil
}
