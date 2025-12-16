package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

const (
	StatusDraft        = "DRAFT"
	StatusPendingAudit = "PENDING_AUDIT"
	StatusRejected     = "REJECTED"
	StatusGuaranteed   = "GUARANTEED"
	StatusListed       = "LISTED"
)

type DonateProject struct {
	ID           int    `json:"id"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Owner        string `json:"owner"`
	Auditor      string `json:"auditor"`
	GuaranteeOrg string `json:"guaranteeOrg"`
	Status       string `json:"status"`
	RejectReason string `json:"rejectReason"`
}

type SmartContract struct {
	contractapi.Contract
}

// Utility: build world state key
func projectKey(id int) string {
	return strconv.Itoa(id)
}

// 1. Creator creates project (Status = DRAFT)
func (s *SmartContract) CreateProject(ctx contractapi.TransactionContextInterface,
	id int, title, description, owner string) error {

	exists, err := s.ProjectExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("project %d already exists", id)
	}

	p := DonateProject{
		ID:           id,
		Title:        title,
		Description:  description,
		Owner:        owner,
		Status:       StatusDraft,
		Auditor:      "",
		GuaranteeOrg: "",
		RejectReason: "",
	}

	data, _ := json.Marshal(p)
	return ctx.GetStub().PutState(projectKey(id), data)
}

// 2. Creator submits project for audit (Status = PENDING_AUDIT)
func (s *SmartContract) SubmitForAudit(ctx contractapi.TransactionContextInterface, id int) error {
	p, err := s.ReadProject(ctx, id)
	if err != nil {
		return err
	}

	if p.Status != StatusDraft {
		return fmt.Errorf("only DRAFT projects can be submitted for audit")
	}

	p.Status = StatusPendingAudit

	data, _ := json.Marshal(p)
	return ctx.GetStub().PutState(projectKey(id), data)
}

//  3. Auditor approves or rejects
//     ✔ If approve = true → GUARANTEED + GuaranteeOrg = auditor
func (s *SmartContract) AuditProject(ctx contractapi.TransactionContextInterface,
	id int, auditor string, approve bool, reason string) error {

	p, err := s.ReadProject(ctx, id)
	if err != nil {
		return err
	}

	if p.Status != StatusPendingAudit {
		return fmt.Errorf("project %d is not in PENDING_AUDIT state", id)
	}

	p.Auditor = auditor

	if approve {
		// 审核通过 = 自动担保
		p.Status = StatusGuaranteed
		p.GuaranteeOrg = auditor
		p.RejectReason = ""
	} else {
		p.Status = StatusRejected
		p.RejectReason = reason
		p.GuaranteeOrg = ""
	}

	data, _ := json.Marshal(p)
	return ctx.GetStub().PutState(projectKey(id), data)
}

// 4. publish (Guaranteed → Listed)
func (s *SmartContract) PublishProject(ctx contractapi.TransactionContextInterface, id int) error {
	p, err := s.ReadProject(ctx, id)
	if err != nil {
		return err
	}

	if p.Status != StatusGuaranteed {
		return fmt.Errorf("project %d must be GUARANTEED before being published", id)
	}

	p.Status = StatusListed

	data, _ := json.Marshal(p)
	return ctx.GetStub().PutState(projectKey(id), data)
}

// Utility: check existence
func (s *SmartContract) ProjectExists(ctx contractapi.TransactionContextInterface, id int) (bool, error) {
	data, err := ctx.GetStub().GetState(projectKey(id))
	if err != nil {
		return false, err
	}
	return data != nil, nil
}

// Utility: read project
func (s *SmartContract) ReadProject(ctx contractapi.TransactionContextInterface, id int) (*DonateProject, error) {
	data, err := ctx.GetStub().GetState(projectKey(id))
	if err != nil {
		return nil, err
	}
	if data == nil {
		return nil, fmt.Errorf("project %d does not exist", id)
	}

	var p DonateProject
	_ = json.Unmarshal(data, &p)
	return &p, nil
}

// main
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
