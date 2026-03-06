package main

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

// Disbursement status constants
const (
	DisbStatusDisbursed    = "DISBURSED"     // Funds released, pending post-audit
	DisbStatusAuditPassed  = "AUDIT_PASSED"  // Post-audit approved
	DisbStatusAuditFlagged = "AUDIT_FLAGGED" // Post-audit flagged an issue
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
	Amount         float64 `json:"amount"`          // Donation amount
	DonorHash      string  `json:"donorHash"`      // Anonymized donor identity (SHA-256 of real ID)
	DonatedAt      string  `json:"donatedAt"`      // Timestamp
	PaymentRefHash string  `json:"paymentRefHash"` // Optional: SHA-256 of off-chain payment receipt/order
}

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
