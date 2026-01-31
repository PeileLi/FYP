package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// Campaign status constants
// Audit mechanism is temporarily optional
const (
	StatusInProgress = "IN_PROGRESS" // Campaign is in progress, accepting donations (进行中)
	StatusCompleted  = "COMPLETED"   // Campaign has been completed (已完成)
	StatusSuspended  = "SUSPENDED"   // Campaign is suspended due to special circumstances (中断)
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