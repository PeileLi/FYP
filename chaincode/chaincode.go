package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// ── MSP identity constants ────────────────────────────────────────────────────
// ThirdPartyMSPID is the Fabric MSP for the third-party auditor organisation (Org2).
// Only peers and clients enrolled under this MSP may call SubmitReviewResult.
// PlatformMSPID is the MSP for the platform / backend (Org1).
// Only peers/clients of this MSP may call ApproveCampaign.
const (
	ThirdPartyMSPID = "Org2MSP" // Third-party auditor organisation
	PlatformMSPID   = "Org1MSP" // Platform / backend organisation
)

// Campaign status constants
const (
	StatusPendingReview = "PENDING_REVIEW" // Waiting for third-party review
	StatusInProgress    = "IN_PROGRESS"    // Approved and accepting donations
	StatusCompleted     = "COMPLETED"      // Campaign completed
	StatusSuspended     = "SUSPENDED"      // Suspended (risk flagged / admin action)
)

// Campaign stores the minimal trusted state for a donation campaign on-chain.
// Detail fields (title, description, category, etc.) live off-chain and are
// anchored by dataHash + version for tamper-evidence.
type Campaign struct {
	CampaignID  string  `json:"campaignId"`  // Unique identifier
	Initiator   string  `json:"initiator"`   // Creator's on-chain identity
	CreatedAt   string  `json:"createdAt"`   // Creation timestamp
	LastUpdated string  `json:"lastUpdated"` // Last modification timestamp
	Deadline    string  `json:"deadline"`    // Optional expiry timestamp (empty = no deadline)
	GoalAmount  float64 `json:"goalAmount"`  // Target amount (hard constraint)
	Status      string  `json:"status"`      // IN_PROGRESS / COMPLETED / SUSPENDED / PENDING_REVIEW
	Auditor     string  `json:"auditor"`     // Auditor org identifier (accountability)
	Version     int     `json:"version"`     // Off-chain data version counter
	DataHash    string  `json:"dataHash"`    // SHA-256 of off-chain detail snapshot (provided by backend)
}

// CampaignHistory records a version snapshot before a campaign update.
// Only on-chain fields are stored; off-chain detail changes are captured
// via the dataHash transition (oldHash → newHash).
type CampaignHistory struct {
	CampaignID string  `json:"campaignId"`
	Version    int     `json:"version"`    // Version that was replaced
	Deadline   string  `json:"deadline"`   // Deadline at this version
	GoalAmount float64 `json:"goalAmount"` // GoalAmount at this version
	Auditor    string  `json:"auditor"`    // Auditor at this version
	DataHash   string  `json:"dataHash"`   // Off-chain data hash at this version
	ModifiedAt string  `json:"modifiedAt"` // When the update occurred
}

// AuditRecord stores a third-party review conclusion on-chain.
// Human-readable details (summary, notes) live off-chain, anchored by commentHash.
type AuditRecord struct {
	AuditID      string `json:"auditId"`      // Unique: AUDIT_{campaignId}_{seq}
	CampaignID   string `json:"campaignId"`   // Reviewed campaign
	ReviewerOrg  string `json:"reviewerOrg"`  // Reviewer org identifier (accountability)
	CallerMSP    string `json:"callerMsp"`    // Fabric MSP ID (cryptographic proof)
	Conclusion   string `json:"conclusion"`   // APPROVED | REJECTED | REQUIRES_INFO | RISK_FLAGGED
	EvidenceHash string `json:"evidenceHash"` // SHA-256 of off-chain evidence files
	CommentHash  string `json:"commentHash"`  // SHA-256 of off-chain review comments/notes
	Timestamp    string `json:"timestamp"`
}

// CampaignApprovalRecord records the platform's approval event on-chain.
// Links to the AuditRecord that gated the approval for an auditable trail.
type CampaignApprovalRecord struct {
	CampaignID    string `json:"campaignId"`
	ApprovedBy    string `json:"approvedBy"`    // Platform admin identifier
	CallerMSP     string `json:"callerMsp"`     // Must be PlatformMSPID
	ReviewAuditID string `json:"reviewAuditId"` // AuditID of the APPROVED review
	Timestamp     string `json:"timestamp"`
}

// Donation stores the minimal on-chain evidence for a single donation.
// Display-layer concerns (displayName, isAnonymous) live off-chain.
// The donor field holds an anonymized identifier (e.g. SHA-256 of real ID)
// so the chain proves "who donated" without leaking PII.
type Donation struct {
	DonationID     string  `json:"donationId"`     // Unique identifier
	CampaignID     string  `json:"campaignId"`     // Associated campaign
	Amount         float64 `json:"amount"`         // Donation amount
	DonorHash      string  `json:"donorHash"`      // Anonymized donor identity (SHA-256 of real ID)
	DonatedAt      string  `json:"donatedAt"`      // Timestamp
	PaymentRefHash string  `json:"paymentRefHash"` // Optional: SHA-256 of off-chain payment receipt/order
}

// Disbursement status constants
const (
	DisbStatusDisbursed    = "DISBURSED"     // Funds released, pending post-audit
	DisbStatusAuditPassed  = "AUDIT_PASSED"  // Post-audit approved
	DisbStatusAuditFlagged = "AUDIT_FLAGGED" // Post-audit flagged an issue
)

// DisbursementRecord stores a fund withdrawal event on-chain.
// Flow: platform disburses first → third-party audits after (先拨款后审核).
type DisbursementRecord struct {
	DisbursementID   string  `json:"disbursementId"` // Unique: DISB_{campaignId}_{seq}
	CampaignID       string  `json:"campaignId"`
	Amount           float64 `json:"amount"`           // Disbursed amount
	RecipientHash    string  `json:"recipientHash"`    // SHA-256 of real recipient identity
	PaymentHash      string  `json:"paymentHash"`      // SHA-256 of off-chain payment proof
	CallerMSP        string  `json:"callerMsp"`        // MSP that recorded the disbursement
	Status           string  `json:"status"`           // DISBURSED / AUDIT_PASSED / AUDIT_FLAGGED
	Timestamp        string  `json:"timestamp"`        // When disbursement was recorded
	AuditedBy        string  `json:"auditedBy"`        // Auditor org (set after audit)
	AuditTimestamp   string  `json:"auditTimestamp"`   // When audit occurred
	AuditCommentHash string  `json:"auditCommentHash"` // SHA-256 of audit comments
}

// SmartContract provides functions for managing campaigns and donations
type SmartContract struct {
	contractapi.Contract
}

// campaignKey generates the world state key for a campaign
func campaignKey(campaignID string) string {
	return "CAMPAIGN_" + campaignID
}

// donationKey generates the world state key for a donation
func donationKey(donationID string) string {
	return "DONATION_" + donationID
}

// validateDataHash rejects obviously invalid hash values. The actual hash is
// computed by the backend from off-chain detail fields; the chaincode only
// stores it as a trust anchor.
func validateDataHash(h string) error {
	if len(h) != 64 {
		return fmt.Errorf("dataHash must be a 64-char hex string (SHA-256), got length %d", len(h))
	}
	return nil
}

// historyKey generates the world state key for campaign history
func historyKey(campaignID string, version int) string {
	return "HISTORY_" + campaignID + "_V" + strconv.Itoa(version)
}

// auditKey generates the world state key for an audit record
func auditKey(campaignID string, seq int) string {
	return "AUDIT_" + campaignID + "_" + strconv.Itoa(seq)
}

// latestAuditSeqKey stores the latest audit sequence number for a campaign
func latestAuditSeqKey(campaignID string) string {
	return "AUDIT_SEQ_" + campaignID
}

// approvalKey generates the world state key for a campaign approval record
func approvalKey(campaignID string) string {
	return "APPROVAL_" + campaignID
}

// disbursementKey generates the world state key for a disbursement record
func disbursementKey(campaignID string, seq int) string {
	return "DISB_" + campaignID + "_" + strconv.Itoa(seq)
}

// latestDisbSeqKey stores the latest disbursement sequence for a campaign
func latestDisbSeqKey(campaignID string) string {
	return "DISB_SEQ_" + campaignID
}

// getCallerMSPID retrieves the MSP ID of the transaction submitter from the client identity.
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

// CreateCampaign writes the minimal trusted state for a new campaign.
// Detail fields (title, description, …) are stored off-chain; their integrity
// is anchored by dataHash.
func (s *SmartContract) CreateCampaign(ctx contractapi.TransactionContextInterface,
	campaignID string, initiator string, createdAt string,
	goalAmount float64, auditor string, deadline string, dataHash string) error {

	exists, err := s.CampaignExists(ctx, campaignID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("campaign %s already exists", campaignID)
	}

	if goalAmount <= 0 {
		return fmt.Errorf("goal amount must be positive, got %f", goalAmount)
	}
	if initiator == "" {
		return fmt.Errorf("initiator is required")
	}
	if err := validateDataHash(dataHash); err != nil {
		return err
	}

	if auditor == "" {
		auditor = "AUTO_APPROVED"
	}

	campaign := Campaign{
		CampaignID:  campaignID,
		Initiator:   initiator,
		CreatedAt:   createdAt,
		LastUpdated: createdAt,
		Deadline:    deadline, // empty string = no deadline
		GoalAmount:  goalAmount,
		Status:      StatusInProgress,
		Auditor:     auditor,
		Version:     1,
		DataHash:    dataHash,
	}

	data, err := json.Marshal(campaign)
	if err != nil {
		return fmt.Errorf("failed to marshal campaign: %v", err)
	}

	return ctx.GetStub().PutState(campaignKey(campaignID), data)
}

// ReadCampaign retrieves a campaign by ID
// 查询捐款项目
func (s *SmartContract) ReadCampaign(ctx contractapi.TransactionContextInterface,
	campaignID string) (*Campaign, error) {

	data, err := ctx.GetStub().GetState(campaignKey(campaignID))
	if err != nil {
		return nil, fmt.Errorf("failed to read campaign: %v", err)
	}
	if data == nil {
		return nil, fmt.Errorf("campaign %s does not exist", campaignID)
	}

	var campaign Campaign
	err = json.Unmarshal(data, &campaign)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal campaign: %v", err)
	}

	return &campaign, nil
}

// UpdateCampaign bumps the version, records the previous snapshot in history,
// and stores the new on-chain mutable values. Off-chain detail changes are
// reflected through the updated dataHash provided by the backend.
func (s *SmartContract) UpdateCampaign(ctx contractapi.TransactionContextInterface,
	campaignID string, newGoalAmount float64, newAuditor string, newDeadline string, newDataHash string) error {

	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to read campaign: %v", err)
	}

	if newGoalAmount <= 0 {
		return fmt.Errorf("goal amount must be positive")
	}
	if err := validateDataHash(newDataHash); err != nil {
		return err
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	modifiedAt := txTimestamp.AsTime().Format("2006-01-02T15:04:05.000Z")

	// Snapshot current version before mutation
	history := CampaignHistory{
		CampaignID: campaign.CampaignID,
		Version:    campaign.Version,
		Deadline:   campaign.Deadline,
		GoalAmount: campaign.GoalAmount,
		Auditor:    campaign.Auditor,
		DataHash:   campaign.DataHash,
		ModifiedAt: modifiedAt,
	}
	historyData, err := json.Marshal(history)
	if err != nil {
		return fmt.Errorf("failed to marshal history: %v", err)
	}
	if err = ctx.GetStub().PutState(historyKey(campaignID, campaign.Version), historyData); err != nil {
		return fmt.Errorf("failed to save history: %v", err)
	}

	// Apply new values
	campaign.GoalAmount = newGoalAmount
	campaign.Auditor = newAuditor
	campaign.Deadline = newDeadline
	campaign.DataHash = newDataHash
	campaign.Version++
	campaign.LastUpdated = modifiedAt

	data, err := json.Marshal(campaign)
	if err != nil {
		return fmt.Errorf("failed to marshal updated campaign: %v", err)
	}
	return ctx.GetStub().PutState(campaignKey(campaignID), data)
}

// GetCampaignHistory retrieves the modification history for a specific version
// 获取项目的指定版本修改历史
func (s *SmartContract) GetCampaignHistory(ctx contractapi.TransactionContextInterface,
	campaignID string, version int) (*CampaignHistory, error) {

	histKey := historyKey(campaignID, version)
	data, err := ctx.GetStub().GetState(histKey)
	if err != nil {
		return nil, fmt.Errorf("failed to read history: %v", err)
	}
	if data == nil {
		return nil, fmt.Errorf("history for campaign %s version %d not found", campaignID, version)
	}

	var history CampaignHistory
	err = json.Unmarshal(data, &history)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal history: %v", err)
	}

	return &history, nil
}

// GetAllCampaignHistory retrieves all modification history for a campaign
// 获取项目的所有修改历史
func (s *SmartContract) GetAllCampaignHistory(ctx contractapi.TransactionContextInterface,
	campaignID string) ([]*CampaignHistory, error) {

	// Read current campaign to get the latest version
	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to read campaign: %v", err)
	}

	// Retrieve all history records from version 1 to current-1
	var histories []*CampaignHistory
	for v := 1; v < campaign.Version; v++ {
		history, err := s.GetCampaignHistory(ctx, campaignID, v)
		if err != nil {
			// Skip if history not found (might not exist for version 1)
			continue
		}
		histories = append(histories, history)
	}

	return histories, nil
}

// UpdateCampaignStatus updates the status of a campaign
// 更新项目状态
func (s *SmartContract) UpdateCampaignStatus(ctx contractapi.TransactionContextInterface,
	campaignID string, newStatus string) error {

	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return err
	}

	// Validate status value
	if newStatus != StatusInProgress && newStatus != StatusCompleted && newStatus != StatusSuspended {
		return fmt.Errorf("invalid status: %s, must be one of: IN_PROGRESS, COMPLETED, SUSPENDED", newStatus)
	}

	campaign.Status = newStatus

	data, err := json.Marshal(campaign)
	if err != nil {
		return fmt.Errorf("failed to marshal campaign: %v", err)
	}

	return ctx.GetStub().PutState(campaignKey(campaignID), data)
}

// CampaignExists checks if a campaign exists
// 检查项目是否存在
func (s *SmartContract) CampaignExists(ctx contractapi.TransactionContextInterface,
	campaignID string) (bool, error) {

	data, err := ctx.GetStub().GetState(campaignKey(campaignID))
	if err != nil {
		return false, fmt.Errorf("failed to check campaign existence: %v", err)
	}

	return data != nil, nil
}

// CreateDonation records the minimal donation evidence on-chain.
// donorHash must be an anonymized identifier (e.g. SHA-256 of the real
// donor ID); the chaincode never receives PII.
func (s *SmartContract) CreateDonation(ctx contractapi.TransactionContextInterface,
	donationID string, campaignID string, amount float64,
	donorHash string, donatedAt string, paymentRefHash string) error {

	exists, err := s.DonationExists(ctx, donationID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("donation %s already exists", donationID)
	}

	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return err
	}
	if campaign.Status != StatusInProgress {
		return fmt.Errorf("campaign %s is not accepting donations (status: %s)", campaignID, campaign.Status)
	}
	if campaign.Deadline != "" && donatedAt > campaign.Deadline {
		return fmt.Errorf("campaign %s has expired (deadline: %s)", campaignID, campaign.Deadline)
	}

	if amount <= 0 {
		return fmt.Errorf("donation amount must be positive")
	}
	if donorHash == "" {
		return fmt.Errorf("donorHash is required")
	}

	donation := Donation{
		DonationID:     donationID,
		CampaignID:     campaignID,
		Amount:         amount,
		DonorHash:      donorHash,
		DonatedAt:      donatedAt,
		PaymentRefHash: paymentRefHash,
	}

	data, err := json.Marshal(donation)
	if err != nil {
		return fmt.Errorf("failed to marshal donation: %v", err)
	}

	return ctx.GetStub().PutState(donationKey(donationID), data)
}

// ReadDonation retrieves a donation by ID
// 查询捐款记录
func (s *SmartContract) ReadDonation(ctx contractapi.TransactionContextInterface,
	donationID string) (*Donation, error) {

	data, err := ctx.GetStub().GetState(donationKey(donationID))
	if err != nil {
		return nil, fmt.Errorf("failed to read donation: %v", err)
	}
	if data == nil {
		return nil, fmt.Errorf("donation %s does not exist", donationID)
	}

	var donation Donation
	err = json.Unmarshal(data, &donation)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal donation: %v", err)
	}

	return &donation, nil
}

// DonationExists checks if a donation exists
// 检查捐款记录是否存在
func (s *SmartContract) DonationExists(ctx contractapi.TransactionContextInterface,
	donationID string) (bool, error) {

	data, err := ctx.GetStub().GetState(donationKey(donationID))
	if err != nil {
		return false, fmt.Errorf("failed to check donation existence: %v", err)
	}

	return data != nil, nil
}

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

	// If RISK_FLAGGED or REJECTED, suspend the campaign on chain
	if conclusion == "RISK_FLAGGED" || conclusion == "REJECTED" {
		campData, _ := ctx.GetStub().GetState(campaignKey(campaignID))
		if campData != nil {
			var camp Campaign
			if err := json.Unmarshal(campData, &camp); err == nil {
				camp.Status = StatusSuspended
				camp.LastUpdated = timestamp
				if updated, err := json.Marshal(camp); err == nil {
					_ = ctx.GetStub().PutState(campaignKey(campaignID), updated)
				}
			}
		}
	}

	return auditID, nil
}

// ── MSP-gated functions ───────────────────────────────────────────────────────

// SubmitReviewResult records a third-party review conclusion on the ledger.
// ACCESS CONTROL: Only Org2MSP (ThirdPartyMSPID) may call this function.
func (s *SmartContract) SubmitReviewResult(ctx contractapi.TransactionContextInterface,
	campaignID string, reviewerOrg string, conclusion string,
	evidenceHash string, commentHash string, timestamp string) (string, error) {

	// ── MSP check ──────────────────────────────────────────────────────────
	mspID, err := getCallerMSPID(ctx)
	if err != nil {
		return "", err
	}
	if mspID != ThirdPartyMSPID {
		return "", fmt.Errorf("access denied: SubmitReviewResult requires MSP=%s, got MSP=%s",
			ThirdPartyMSPID, mspID)
	}

	// ── Validate conclusion ────────────────────────────────────────────────
	validConclusions := map[string]bool{
		"APPROVED": true, "REJECTED": true, "REQUIRES_INFO": true, "RISK_FLAGGED": true,
	}
	if !validConclusions[conclusion] {
		return "", fmt.Errorf("invalid conclusion: %s", conclusion)
	}

	// ── Verify campaign exists ─────────────────────────────────────────────
	exists, err := s.CampaignExists(ctx, campaignID)
	if err != nil {
		return "", err
	}
	if !exists {
		return "", fmt.Errorf("campaign %s does not exist", campaignID)
	}

	// ── Allocate sequence number ───────────────────────────────────────────
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

	// ── Side-effects: suspend campaign if risk-flagged ─────────────────────
	if conclusion == "RISK_FLAGGED" {
		campData, _ := ctx.GetStub().GetState(campaignKey(campaignID))
		if campData != nil {
			var camp Campaign
			if err := json.Unmarshal(campData, &camp); err == nil {
				camp.Status = StatusSuspended
				camp.LastUpdated = timestamp
				if updated, err := json.Marshal(camp); err == nil {
					_ = ctx.GetStub().PutState(campaignKey(campaignID), updated)
				}
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

	// ── MSP check ──────────────────────────────────────────────────────────
	if err := requireMSP(ctx, PlatformMSPID); err != nil {
		return fmt.Errorf("ApproveCampaign: %v", err)
	}

	// ── Load campaign ──────────────────────────────────────────────────────
	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return err
	}

	// ── Review gate: require latest audit to be APPROVED ──────────────────
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

	// ── Transition status ──────────────────────────────────────────────────
	campaign.Status = StatusInProgress
	campaign.LastUpdated = timestamp

	data, err := json.Marshal(campaign)
	if err != nil {
		return fmt.Errorf("failed to marshal campaign: %v", err)
	}
	if err := ctx.GetStub().PutState(campaignKey(campaignID), data); err != nil {
		return fmt.Errorf("failed to save approved campaign: %v", err)
	}

	// ── Write approval record ──────────────────────────────────────────────
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

// QueryReviews returns all audit records for a campaign.
// ACCESS CONTROL: Open — any enrolled identity on the channel may query.
// Results include the CallerMSP field so consumers can verify the review was
// submitted by the authorised third-party organisation.
func (s *SmartContract) QueryReviews(ctx contractapi.TransactionContextInterface,
	campaignID string) ([]*AuditRecord, error) {

	// Any org may query — no MSP restriction
	seqBytes, err := ctx.GetStub().GetState(latestAuditSeqKey(campaignID))
	if err != nil {
		return nil, fmt.Errorf("failed to read audit sequence: %v", err)
	}
	if seqBytes == nil {
		return []*AuditRecord{}, nil // no reviews yet
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
		return nil, nil // not yet approved
	}
	var record CampaignApprovalRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, fmt.Errorf("failed to unmarshal approval record: %v", err)
	}
	return &record, nil
}

// GetLatestAuditRecord retrieves the most recent audit record for a campaign
func (s *SmartContract) GetLatestAuditRecord(ctx contractapi.TransactionContextInterface,
	campaignID string) (*AuditRecord, error) {

	seqBytes, err := ctx.GetStub().GetState(latestAuditSeqKey(campaignID))
	if err != nil {
		return nil, fmt.Errorf("failed to read audit sequence: %v", err)
	}
	if seqBytes == nil {
		return nil, nil // No audit yet
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

// ── Disbursement functions (先拨款后审核) ──────────────────────────────────────

// RecordDisbursement records that the platform has disbursed funds for a campaign.
// ACCESS CONTROL: Only PlatformMSPID (Org1MSP) may record disbursements.
func (s *SmartContract) RecordDisbursement(ctx contractapi.TransactionContextInterface,
	campaignID string, amount float64, recipientHash string,
	paymentHash string, timestamp string) (string, error) {

	if err := requireMSP(ctx, PlatformMSPID); err != nil {
		return "", fmt.Errorf("RecordDisbursement: %v", err)
	}

	exists, err := s.CampaignExists(ctx, campaignID)
	if err != nil {
		return "", err
	}
	if !exists {
		return "", fmt.Errorf("campaign %s does not exist", campaignID)
	}

	if amount <= 0 {
		return "", fmt.Errorf("disbursement amount must be positive")
	}
	if recipientHash == "" || paymentHash == "" {
		return "", fmt.Errorf("recipientHash and paymentHash are required")
	}

	seqBytes, err := ctx.GetStub().GetState(latestDisbSeqKey(campaignID))
	if err != nil {
		return "", fmt.Errorf("failed to read disbursement sequence: %v", err)
	}
	seq := 1
	if seqBytes != nil {
		seq, _ = strconv.Atoi(string(seqBytes))
		seq++
	}

	callerMSP, _ := getCallerMSPID(ctx)
	disbID := "DISB_" + campaignID + "_" + strconv.Itoa(seq)

	record := DisbursementRecord{
		DisbursementID: disbID,
		CampaignID:     campaignID,
		Amount:         amount,
		RecipientHash:  recipientHash,
		PaymentHash:    paymentHash,
		CallerMSP:      callerMSP,
		Status:         DisbStatusDisbursed,
		Timestamp:      timestamp,
	}

	data, err := json.Marshal(record)
	if err != nil {
		return "", fmt.Errorf("failed to marshal disbursement: %v", err)
	}
	if err := ctx.GetStub().PutState(disbursementKey(campaignID, seq), data); err != nil {
		return "", fmt.Errorf("failed to store disbursement: %v", err)
	}
	if err := ctx.GetStub().PutState(latestDisbSeqKey(campaignID), []byte(strconv.Itoa(seq))); err != nil {
		return "", fmt.Errorf("failed to update disbursement sequence: %v", err)
	}

	_ = ctx.GetStub().SetEvent("DisbursementRecorded", []byte(
		fmt.Sprintf(`{"disbursementId":"%s","campaignId":"%s","amount":%f}`,
			disbID, campaignID, amount)))

	return disbID, nil
}

// AuditDisbursement allows the third-party auditor to review a disbursement
// after funds have already been released (后审核).
// ACCESS CONTROL: Only ThirdPartyMSPID (Org2MSP) may audit disbursements.
func (s *SmartContract) AuditDisbursement(ctx contractapi.TransactionContextInterface,
	campaignID string, disbSeq int, approved bool,
	auditCommentHash string, timestamp string) error {

	if err := requireMSP(ctx, ThirdPartyMSPID); err != nil {
		return fmt.Errorf("AuditDisbursement: %v", err)
	}

	data, err := ctx.GetStub().GetState(disbursementKey(campaignID, disbSeq))
	if err != nil {
		return fmt.Errorf("failed to read disbursement: %v", err)
	}
	if data == nil {
		return fmt.Errorf("disbursement %s seq %d not found", campaignID, disbSeq)
	}

	var record DisbursementRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return fmt.Errorf("failed to unmarshal disbursement: %v", err)
	}

	if record.Status != DisbStatusDisbursed {
		return fmt.Errorf("disbursement already audited (status: %s)", record.Status)
	}

	mspID, _ := getCallerMSPID(ctx)
	record.AuditedBy = mspID
	record.AuditTimestamp = timestamp
	record.AuditCommentHash = auditCommentHash

	if approved {
		record.Status = DisbStatusAuditPassed
	} else {
		record.Status = DisbStatusAuditFlagged
	}

	updated, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal updated disbursement: %v", err)
	}
	if err := ctx.GetStub().PutState(disbursementKey(campaignID, disbSeq), updated); err != nil {
		return fmt.Errorf("failed to store updated disbursement: %v", err)
	}

	_ = ctx.GetStub().SetEvent("DisbursementAudited", []byte(
		fmt.Sprintf(`{"disbursementId":"%s","status":"%s","auditedBy":"%s"}`,
			record.DisbursementID, record.Status, mspID)))

	return nil
}

// QueryDisbursements returns all disbursement records for a campaign.
func (s *SmartContract) QueryDisbursements(ctx contractapi.TransactionContextInterface,
	campaignID string) ([]*DisbursementRecord, error) {

	seqBytes, err := ctx.GetStub().GetState(latestDisbSeqKey(campaignID))
	if err != nil {
		return nil, fmt.Errorf("failed to read disbursement sequence: %v", err)
	}
	if seqBytes == nil {
		return []*DisbursementRecord{}, nil
	}
	maxSeq, _ := strconv.Atoi(string(seqBytes))

	var records []*DisbursementRecord
	for i := 1; i <= maxSeq; i++ {
		data, err := ctx.GetStub().GetState(disbursementKey(campaignID, i))
		if err != nil || data == nil {
			continue
		}
		var r DisbursementRecord
		if err := json.Unmarshal(data, &r); err == nil {
			records = append(records, &r)
		}
	}
	return records, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating chaincode: %v", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting chaincode: %v", err)
	}
}
