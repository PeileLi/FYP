package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// CreateDonation records the minimal donation evidence on-chain.
// The donation ID is derived from the Fabric transaction ID (GetTxID).
// donorHash must be an anonymized identifier (e.g. SHA-256 of the real
// donor ID); the chaincode never receives PII.
// Returns the generated donationID.
func (s *SmartContract) CreateDonation(ctx contractapi.TransactionContextInterface,
	campaignID string, amount float64,
	donorHash string, donatedAt string, paymentRefHash string) (string, error) {

	donationID := ctx.GetStub().GetTxID()

	campaign, err := s.ReadCampaign(ctx, campaignID)
	if err != nil {
		return "", err
	}
	if campaign.Status != StatusInProgress {
		return "", fmt.Errorf("campaign %s is not accepting donations (status: %s)", campaignID, campaign.Status)
	}
	if campaign.Deadline != "" && donatedAt > campaign.Deadline {
		return "", fmt.Errorf("campaign %s has expired (deadline: %s)", campaignID, campaign.Deadline)
	}

	if amount <= 0 {
		return "", fmt.Errorf("donation amount must be positive")
	}
	if donorHash == "" {
		return "", fmt.Errorf("donorHash is required")
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
		return "", fmt.Errorf("failed to marshal donation: %v", err)
	}

	if err := ctx.GetStub().PutState(donationKey(donationID), data); err != nil {
		return "", fmt.Errorf("failed to save donation: %v", err)
	}

	return donationID, nil
}

// ReadDonation retrieves a donation by ID.
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

// DonationExists checks if a donation exists.
func (s *SmartContract) DonationExists(ctx contractapi.TransactionContextInterface,
	donationID string) (bool, error) {

	data, err := ctx.GetStub().GetState(donationKey(donationID))
	if err != nil {
		return false, fmt.Errorf("failed to check donation existence: %v", err)
	}

	return data != nil, nil
}
