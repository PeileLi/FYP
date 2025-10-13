package main

import (
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Project struct represents a crowdfunding project
type Project struct {
    ID        string   // Project ID
    Name      string   // Project name
    Goal      int      // Funding goal
    Raised    int      // Amount raised so far
    Creator   string   // Project creator
    Donors    []string // List of donors
}

// CrowdfundingContract defines the Smart Contract structure
type CrowdfundingContract struct {
    contractapi.Contract
}

// CreateProject creates a new crowdfunding project
func (c *CrowdfundingContract) CreateProject(ctx contractapi.TransactionContextInterface, projectID string, name string, goal int, creator string) error {
    // 1. Check if the project already exists
    // 2. Initialize Project object
    // 3. Write project to the ledger
    return nil
}

// Donate allows a user to donate to a project
func (c *CrowdfundingContract) Donate(ctx contractapi.TransactionContextInterface, projectID string, donor string, amount int) error {
    // 1. Retrieve project from ledger
    // 2. Increase Raised amount
    // 3. Add donor to the donor list
    // 4. Update project on the ledger
    return nil
}

// QueryProject retrieves a single project by its ID
func (c *CrowdfundingContract) QueryProject(ctx contractapi.TransactionContextInterface, projectID string) (*Project, error) {
    // 1. Get project from ledger
    // 2. Return the Project object
    return nil, nil
}

// QueryAllProjects retrieves all projects (optional)
func (c *CrowdfundingContract) QueryAllProjects(ctx contractapi.TransactionContextInterface) ([]*Project, error) {
    // 1. Query all projects from the ledger
    // 2. Return the list of projects
    return nil, nil
}

func main() {
    chaincode, err := contractapi.NewChaincode(&CrowdfundingContract{})
    if err != nil {
        panic(err)
    }

    if err := chaincode.Start(); err != nil {
        panic(err)
    }
}
