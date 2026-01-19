package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// Campaign status constants
// All campaigns on-chain have passed third-party audit
const (
	StatusInProgress = "IN_PROGRESS" // Campaign is in progress, accepting donations (进行中)
	StatusCompleted  = "COMPLETED"   // Campaign has been completed (已完成)
	StatusSuspended  = "SUSPENDED"   // Campaign is suspended due to special circumstances (中断)
)

// Campaign represents a donation campaign on the blockchain
// 捐款项目 - 上链即代表已通过第三方审核
type Campaign struct {
	CampaignID  string `json:"campaignId"`  // Unique campaign identifier (捐款编号)
	Initiator   string `json:"initiator"`   // Campaign creator (发起人)
	CreatedAt   string `json:"createdAt"`   // Creation timestamp (发起时间)
	Status      string `json:"status"`      // Campaign status (状态)
	Description string `json:"description"` // Campaign description/keywords (项目描述/关键字)
	Auditor     string `json:"auditor"`     // Third-party auditor/organization that approved this campaign (审核机构)
}

// Donation represents a single donation record on the blockchain
// 捐款记录
type Donation struct {
	DonationID string  `json:"donationId"` // Unique donation identifier
	CampaignID string  `json:"campaignId"` // Associated campaign ID (关联项目编号)
	Amount     float64 `json:"amount"`     // Donation amount (捐款金额)
	Donor      string  `json:"donor"`      // Donor identifier (捐款人)
	DonatedAt  string  `json:"donatedAt"`  // Donation timestamp (捐款时间)
}

// SmartContract provides functions for managing campaigns and donations
type SmartContract struct {
	contractapi.Contract
}

// ==================== Key Generation ====================

// campaignKey generates the world state key for a campaign
func campaignKey(campaignID string) string {
	return "CAMPAIGN_" + campaignID
}

// donationKey generates the world state key for a donation
func donationKey(donationID string) string {
	return "DONATION_" + donationID
}

// ==================== Campaign Functions ====================

// CreateCampaign creates a new donation campaign (already approved by auditor)
// 创建捐款项目 - 上链即代表已通过审核
func (s *SmartContract) CreateCampaign(ctx contractapi.TransactionContextInterface,
	campaignID string, initiator string, createdAt string, description string, auditor string) error {

	// Check if campaign already exists
	exists, err := s.CampaignExists(ctx, campaignID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("campaign %s already exists", campaignID)
	}

	// Auditor is required since all on-chain campaigns must be audited
	if auditor == "" {
		return fmt.Errorf("auditor is required for campaign creation")
	}

	campaign := Campaign{
		CampaignID:  campaignID,
		Initiator:   initiator,
		CreatedAt:   createdAt,
		Status:      StatusInProgress,
		Description: description,
		Auditor:     auditor,
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

// ==================== Donation Functions ====================

// CreateDonation records a new donation
// 创建捐款记录
func (s *SmartContract) CreateDonation(ctx contractapi.TransactionContextInterface,
	donationID string, campaignID string, amount float64, donor string, donatedAt string) error {

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
		DonationID: donationID,
		CampaignID: campaignID,
		Amount:     amount,
		Donor:      donor,
		DonatedAt:  donatedAt,
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

// ==================== Main ====================

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
