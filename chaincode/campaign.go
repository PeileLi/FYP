package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// CreateCampaign writes the minimal trusted state for a new campaign.
// The campaign ID is derived from the Fabric transaction ID (GetTxID),
// guaranteeing uniqueness without relying on the caller to generate one.
// Detail fields (title, description, …) are stored off-chain; their integrity
// is anchored by dataHash.
// Returns the generated campaignID.
func (s *SmartContract) CreateCampaign(ctx contractapi.TransactionContextInterface,
	initiator string, createdAt string,
	goalAmount float64, auditor string, deadline string, dataHash string) (string, error) {

	campaignID := ctx.GetStub().GetTxID()

	if goalAmount <= 0 {
		return "", fmt.Errorf("goal amount must be positive, got %f", goalAmount)
	}
	if initiator == "" {
		return "", fmt.Errorf("initiator is required")
	}
	if err := validateDataHash(dataHash); err != nil {
		return "", err
	}

	if auditor == "" {
		auditor = "THIRD_PARTY"
	}

	campaign := Campaign{
		CampaignID:  campaignID,
		Initiator:   initiator,
		CreatedAt:   createdAt,
		LastUpdated: createdAt,
		Deadline:    deadline,
		GoalAmount:  goalAmount,
		Status:      StatusPendingReview,
		Auditor:     auditor,
		Version:     1,
		DataHash:    dataHash,
	}

	data, err := json.Marshal(campaign)
	if err != nil {
		return "", fmt.Errorf("failed to marshal campaign: %v", err)
	}

	if err := ctx.GetStub().PutState(campaignKey(campaignID), data); err != nil {
		return "", fmt.Errorf("failed to save campaign: %v", err)
	}

	return campaignID, nil
}

// ReadCampaign retrieves a campaign by ID.
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

// GetCampaignHistory retrieves the modification history for a specific version.
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

// GetAllCampaignHistory retrieves all modification history for a campaign.
func (s *SmartContract) GetAllCampaignHistory(ctx contractapi.TransactionContextInterface,
	campaignID string) ([]*CampaignHistory, error) {

	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to read campaign: %v", err)
	}

	var histories []*CampaignHistory
	for v := 1; v < campaign.Version; v++ {
		history, err := s.GetCampaignHistory(ctx, campaignID, v)
		if err != nil {
			continue
		}
		histories = append(histories, history)
	}

	return histories, nil
}

// UpdateCampaignStatus updates the status of a campaign.
func (s *SmartContract) UpdateCampaignStatus(ctx contractapi.TransactionContextInterface,
	campaignID string, newStatus string) error {

	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return err
	}

	if newStatus != StatusPendingReview && newStatus != StatusInProgress && newStatus != StatusCompleted && newStatus != StatusSuspended {
		return fmt.Errorf("invalid status: %s, must be one of: PENDING_REVIEW, IN_PROGRESS, COMPLETED, SUSPENDED", newStatus)
	}

	campaign.Status = newStatus

	data, err := json.Marshal(campaign)
	if err != nil {
		return fmt.Errorf("failed to marshal campaign: %v", err)
	}

	return ctx.GetStub().PutState(campaignKey(campaignID), data)
}

// CampaignExists checks if a campaign exists.
func (s *SmartContract) CampaignExists(ctx contractapi.TransactionContextInterface,
	campaignID string) (bool, error) {

	data, err := ctx.GetStub().GetState(campaignKey(campaignID))
	if err != nil {
		return false, fmt.Errorf("failed to check campaign existence: %v", err)
	}

	return data != nil, nil
}
