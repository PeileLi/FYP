package main

import (
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SimpleChaincode
type SimpleChaincode struct {
	contractapi.Contract
}

// InitLedger
func (s *SimpleChaincode) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("Ledger initialized successfully.")
	return nil
}

// QueryData
func (s *SimpleChaincode) QueryData(ctx contractapi.TransactionContextInterface) string {
	return "This is a simple chaincode running successfully!"
}

func main() {
	cc, err := contractapi.NewChaincode(&SimpleChaincode{})
	if err != nil {
		fmt.Printf("Error creating chaincode: %v\n", err)
		return
	}

	if err := cc.Start(); err != nil {
		fmt.Printf("Error starting chaincode: %v\n", err)
	}
}

