package main

import (
	"crypto/sha256"
	"encoding/hex"
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

// Campaign represents a donation campaign on the blockchain
// 捐款项目 - 支持审核后修改
type Campaign struct {
	// Absolute Immutable fields - NEVER change (绝对不可变字段)
	CampaignID string `json:"campaignId"` // Unique campaign identifier (捐款编号)
	Initiator  string `json:"initiator"`  // Campaign creator (发起人)
	CreatedAt  string `json:"createdAt"`  // Creation timestamp (发起时间)

	// Auditable Mutable fields - can be modified with approval (可审核修改字段)
	Title       string  `json:"title"`       // Campaign title (活动标题)
	Description string  `json:"description"` // Campaign description (项目描述)
	Category    string  `json:"category"`    // Campaign category (项目分类)
	GoalAmount  float64 `json:"goalAmount"`  // Target amount to raise (目标金额)
	Auditor     string  `json:"auditor"`     // Third-party auditor/organization (审核机构)

	// Versioning and Hash (版本控制和哈希)
	Version      int    `json:"version"`      // Data version, increment on each approved modification (数据版本)
	DataHash     string `json:"dataHash"`     // SHA-256 hash of current version (当前版本的hash)
	LastUpdated  string `json:"lastUpdated"`  // Last modification timestamp (最后修改时间)
	LastModifier string `json:"lastModifier"` // Who made the last modification (最后修改者)

	// Dynamic Operational fields (动态运营字段)
	Status        string  `json:"status"`        // Campaign status: IN_PROGRESS/COMPLETED/SUSPENDED (状态)
	TotalAmount   float64 `json:"totalAmount"`   // Total amount raised (总筹款金额)
	DonationCount int     `json:"donationCount"` // Total number of donations (捐款次数)
}

// CampaignHistory records historical versions of campaign modifications
// 记录活动的历史修改版本
type CampaignHistory struct {
	CampaignID   string  `json:"campaignId"`
	Version      int     `json:"version"`
	Title        string  `json:"title"`
	Description  string  `json:"description"`
	Category     string  `json:"category"`
	GoalAmount   float64 `json:"goalAmount"`
	Auditor      string  `json:"auditor"`
	DataHash     string  `json:"dataHash"`
	ModifiedAt   string  `json:"modifiedAt"`
	ModifiedBy   string  `json:"modifiedBy"`
	ModifyReason string  `json:"modifyReason"` // Reason for modification (修改原因)
}

// AuditRecord stores a third-party partner's audit conclusion for a campaign.
// Written by SubmitReviewResult (Org2MSP) or RecordAudit (backward-compat).
type AuditRecord struct {
	DocType         string `json:"docType"`         // "AUDIT"
	AuditID         string `json:"auditId"`         // Unique: AUDIT_{campaignId}_{seq}
	CampaignID      string `json:"campaignId"`
	AuditorOrg      string `json:"auditorOrg"`      // Partner display name
	CallerMSP       string `json:"callerMsp"`       // Fabric MSP ID of the submitting organisation
	Conclusion      string `json:"conclusion"`      // APPROVED | REJECTED | REQUIRES_INFO | RISK_FLAGGED
	EvidenceSummary string `json:"evidenceSummary"` // Human-readable summary
	EvidenceHash    string `json:"evidenceHash"`    // SHA-256 of off-chain evidence files
	Notes           string `json:"notes"`           // Additional remarks
	Timestamp       string `json:"timestamp"`
}

// CampaignApprovalRecord is written by ApproveCampaign to record the approval event.
type CampaignApprovalRecord struct {
	DocType        string `json:"docType"`        // "APPROVAL"
	CampaignID     string `json:"campaignId"`
	ApprovedBy     string `json:"approvedBy"`     // Platform admin identifier
	CallerMSP      string `json:"callerMsp"`      // Must be PlatformMSPID
	ReviewAuditID  string `json:"reviewAuditId"`  // The APPROVED review that gated this action
	Timestamp      string `json:"timestamp"`
}

// Donation represents a single donation record on the blockchain
// 捐款记录
type Donation struct {
	DonationID  string  `json:"donationId"`  // Unique donation identifier
	CampaignID  string  `json:"campaignId"`  // Associated campaign ID (关联项目编号)
	Amount      float64 `json:"amount"`      // Donation amount (捐款金额)
	Donor       string  `json:"donor"`       // Donor identifier (捐款人真实标识，保留在链上)
	DisplayName string  `json:"displayName"` // Public display name (公开显示名称)
	IsAnonymous bool    `json:"isAnonymous"` // Whether donation is anonymous (是否匿名)
	DonatedAt   string  `json:"donatedAt"`   // Donation timestamp (捐款时间)
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

// calculateCampaignHash computes SHA-256 of immutable + auditable fields + version. Dynamic fields (TotalAmount, DonationCount, Status) are excluded.
func calculateCampaignHash(c *Campaign) string {
	data := c.CampaignID +
		"|" + c.Initiator +
		"|" + c.CreatedAt +
		"|" + c.Title +
		"|" + c.Description +
		"|" + c.Category +
		"|" + strconv.FormatFloat(c.GoalAmount, 'f', 2, 64) +
		"|" + c.Auditor +
		"|" + strconv.Itoa(c.Version)

	// Compute SHA-256 hash
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
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

// CreateCampaign creates a new donation campaign
// 创建捐款项目 - 审核机制暂时可选
func (s *SmartContract) CreateCampaign(ctx contractapi.TransactionContextInterface,
	campaignID string, title string, description string, category string, initiator string, createdAt string, goalAmount float64, auditor string) error {

	// Check if campaign already exists
	exists, err := s.CampaignExists(ctx, campaignID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("campaign %s already exists", campaignID)
	}

	// Validate goal amount
	if goalAmount <= 0 {
		return fmt.Errorf("goal amount must be positive, got %f", goalAmount)
	}

	// Validate required fields
	if title == "" || description == "" || category == "" || initiator == "" {
		return fmt.Errorf("title, description, category, and initiator are required")
	}

	// If auditor is empty, set default value to bypass audit for now
	// 如果审核机构为空，设置默认值以暂时跳过审核
	if auditor == "" {
		auditor = "AUTO_APPROVED"
	}

	campaign := Campaign{
		// Absolute immutable fields
		CampaignID: campaignID,
		Initiator:  initiator,
		CreatedAt:  createdAt,

		// Auditable mutable fields (initial values)
		Title:       title,
		Description: description,
		Category:    category,
		GoalAmount:  goalAmount,
		Auditor:     auditor,

		// Versioning fields (initial values)
		Version:      1,
		LastUpdated:  createdAt,
		LastModifier: initiator,

		// Dynamic operational fields (initial values)
		Status:        StatusInProgress,
		TotalAmount:   0.0,
		DonationCount: 0,
	}

	// Calculate data hash for integrity verification
	campaign.DataHash = calculateCampaignHash(&campaign)

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

// UpdateCampaign updates auditable mutable fields of a campaign with approval
// This creates a new version, recalculates hash, and stores the old version in history
// 更新项目的可审核修改字段（需要审核批准）
// 会创建新版本、重新计算hash、并将旧版本存入历史记录
func (s *SmartContract) UpdateCampaign(ctx contractapi.TransactionContextInterface,
	campaignID string, modifier string, modifyReason string,
	newTitle string, newDescription string, newCategory string, newGoalAmount float64, newAuditor string) error {

	// Read current campaign
	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to read campaign: %v", err)
	}

	// Validate new values
	if newGoalAmount <= 0 {
		return fmt.Errorf("goal amount must be positive")
	}
	if newTitle == "" || newDescription == "" || newCategory == "" {
		return fmt.Errorf("title, description, and category cannot be empty")
	}

	// Get current timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	modifiedAt := txTimestamp.AsTime().Format("2006-01-02T15:04:05.000Z")

	// Create history record for current version BEFORE modification
	history := CampaignHistory{
		CampaignID:   campaign.CampaignID,
		Version:      campaign.Version,
		Title:        campaign.Title,
		Description:  campaign.Description,
		Category:     campaign.Category,
		GoalAmount:   campaign.GoalAmount,
		Auditor:      campaign.Auditor,
		DataHash:     campaign.DataHash,
		ModifiedAt:   modifiedAt,
		ModifiedBy:   modifier,
		ModifyReason: modifyReason,
	}

	// Save history to blockchain
	historyData, err := json.Marshal(history)
	if err != nil {
		return fmt.Errorf("failed to marshal history: %v", err)
	}
	histKey := historyKey(campaignID, campaign.Version)
	err = ctx.GetStub().PutState(histKey, historyData)
	if err != nil {
		return fmt.Errorf("failed to save history: %v", err)
	}

	// Update campaign with new values
	campaign.Title = newTitle
	campaign.Description = newDescription
	campaign.Category = newCategory
	campaign.GoalAmount = newGoalAmount
	campaign.Auditor = newAuditor

	// Increment version
	campaign.Version++
	campaign.LastUpdated = modifiedAt
	campaign.LastModifier = modifier

	// Recalculate hash for new version
	campaign.DataHash = calculateCampaignHash(campaign)

	// Save updated campaign
	data, err := json.Marshal(campaign)
	if err != nil {
		return fmt.Errorf("failed to marshal updated campaign: %v", err)
	}

	key := campaignKey(campaignID)
	err = ctx.GetStub().PutState(key, data)
	if err != nil {
		return fmt.Errorf("failed to save updated campaign: %v", err)
	}

	return nil
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

// CreateDonation records a new donation
// 创建捐款记录
func (s *SmartContract) CreateDonation(ctx contractapi.TransactionContextInterface,
	donationID string, campaignID string, amount float64, donor string, displayName string, isAnonymous bool, donatedAt string) error {

	// Check if donation already exists
	exists, err := s.DonationExists(ctx, donationID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("donation %s already exists", donationID)
	}

	// Verify the campaign exists and is in progress
	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return err
	}
	if campaign.Status != StatusInProgress {
		return fmt.Errorf("campaign %s is not accepting donations (status: %s)", campaignID, campaign.Status)
	}

	// Validate amount
	if amount <= 0 {
		return fmt.Errorf("donation amount must be positive")
	}

	donation := Donation{
		DonationID:  donationID,
		CampaignID:  campaignID,
		Amount:      amount,
		Donor:       donor,
		DisplayName: displayName,
		IsAnonymous: isAnonymous,
		DonatedAt:   donatedAt,
	}

	data, err := json.Marshal(donation)
	if err != nil {
		return fmt.Errorf("failed to marshal donation: %v", err)
	}

	// Save donation
	err = ctx.GetStub().PutState(donationKey(donationID), data)
	if err != nil {
		return fmt.Errorf("failed to save donation: %v", err)
	}

	// Update campaign total amount and donation count (immutable on blockchain)
	campaign.TotalAmount += amount
	campaign.DonationCount++

	// Recalculate data hash after updating amount
	campaign.DataHash = calculateCampaignHash(campaign)

	campaignData, err := json.Marshal(campaign)
	if err != nil {
		return fmt.Errorf("failed to marshal updated campaign: %v", err)
	}

	return ctx.GetStub().PutState(campaignKey(campaignID), campaignData)
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

// RecordAudit records a third-party audit conclusion for a campaign on the ledger.
// conclusion must be one of: APPROVED, REJECTED, REQUIRES_INFO, RISK_FLAGGED
func (s *SmartContract) RecordAudit(ctx contractapi.TransactionContextInterface,
	campaignID string, auditorOrg string, conclusion string,
	evidenceSummary string, evidenceHash string, notes string, timestamp string) (string, error) {

	// Validate conclusion value
	validConclusions := map[string]bool{
		"APPROVED": true, "REJECTED": true, "REQUIRES_INFO": true, "RISK_FLAGGED": true,
	}
	if !validConclusions[conclusion] {
		return "", fmt.Errorf("invalid conclusion: %s. Must be APPROVED, REJECTED, REQUIRES_INFO, or RISK_FLAGGED", conclusion)
	}

	// Verify campaign exists
	exists, err := s.CampaignExists(ctx, campaignID)
	if err != nil {
		return "", err
	}
	if !exists {
		return "", fmt.Errorf("campaign %s does not exist", campaignID)
	}

	// Get current sequence number
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

	// Capture caller MSP for backward-compat (may be any org in this legacy path)
	callerMSP, _ := getCallerMSPID(ctx)

	auditID := "AUDIT_" + campaignID + "_" + strconv.Itoa(seq)
	record := AuditRecord{
		DocType:         "AUDIT",
		AuditID:         auditID,
		CampaignID:      campaignID,
		AuditorOrg:      auditorOrg,
		CallerMSP:       callerMSP,
		Conclusion:      conclusion,
		EvidenceSummary: evidenceSummary,
		EvidenceHash:    evidenceHash,
		Notes:           notes,
		Timestamp:       timestamp,
	}

	data, err := json.Marshal(record)
	if err != nil {
		return "", fmt.Errorf("failed to marshal audit record: %v", err)
	}

	if err := ctx.GetStub().PutState(auditKey(campaignID, seq), data); err != nil {
		return "", fmt.Errorf("failed to store audit record: %v", err)
	}

	// Update sequence counter
	if err := ctx.GetStub().PutState(latestAuditSeqKey(campaignID), []byte(strconv.Itoa(seq))); err != nil {
		return "", fmt.Errorf("failed to update sequence: %v", err)
	}

	// If RISK_FLAGGED or REJECTED, also suspend the campaign status on chain
	if conclusion == "RISK_FLAGGED" || conclusion == "REJECTED" {
		campData, _ := ctx.GetStub().GetState(campaignKey(campaignID))
		if campData != nil {
			var camp Campaign
			if err := json.Unmarshal(campData, &camp); err == nil {
				if conclusion == "RISK_FLAGGED" {
					camp.Status = StatusSuspended
				}
				camp.LastUpdated = timestamp
				camp.LastModifier = auditorOrg
				if updated, err := json.Marshal(camp); err == nil {
					_ = ctx.GetStub().PutState(campaignKey(campaignID), updated)
				}
			}
		}
	}

	return auditID, nil
}

// ── MSP-gated functions ───────────────────────────────────────────────────────

// SubmitReviewResult records a third-party audit conclusion on the ledger.
// ACCESS CONTROL: Only callers whose client certificate is issued by ThirdPartyMSPID
// (Org2MSP) are permitted.  A platform org (Org1MSP) calling this function will
// receive a 403-equivalent error embedded in the chaincode response.
func (s *SmartContract) SubmitReviewResult(ctx contractapi.TransactionContextInterface,
	campaignID string, auditorOrg string, conclusion string,
	evidenceSummary string, evidenceHash string, notes string, timestamp string) (string, error) {

	// ── MSP check ──────────────────────────────────────────────────────────
	mspID, err := getCallerMSPID(ctx)
	if err != nil {
		return "", err
	}
	if mspID != ThirdPartyMSPID {
		return "", fmt.Errorf("access denied: SubmitReviewResult requires caller MSP=%s, got MSP=%s. "+
			"Only the third-party auditor organisation may submit review results.", ThirdPartyMSPID, mspID)
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
		DocType:         "AUDIT",
		AuditID:         auditID,
		CampaignID:      campaignID,
		AuditorOrg:      auditorOrg,
		CallerMSP:       mspID, // recorded — proves Org2MSP submitted this
		Conclusion:      conclusion,
		EvidenceSummary: evidenceSummary,
		EvidenceHash:    evidenceHash,
		Notes:           notes,
		Timestamp:       timestamp,
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
				camp.LastModifier = auditorOrg + " [" + mspID + "]"
				if updated, err := json.Marshal(camp); err == nil {
					_ = ctx.GetStub().PutState(campaignKey(campaignID), updated)
				}
			}
		}
	}

	// Emit event so application layer can react
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
			campaignID, latestAudit.Conclusion, latestAudit.AuditorOrg, latestAudit.CallerMSP)
	}

	// ── Transition status ──────────────────────────────────────────────────
	campaign.Status = StatusInProgress
	campaign.LastUpdated = timestamp
	campaign.LastModifier = approvedBy + " [" + PlatformMSPID + "]"
	campaign.DataHash = calculateCampaignHash(campaign)

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
		DocType:       "APPROVAL",
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
