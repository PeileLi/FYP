package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

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
