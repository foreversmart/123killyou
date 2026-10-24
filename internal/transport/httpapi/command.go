package httpapi

type command struct {
	Type      string `json:"type"`
	RunID     string `json:"runId" binding:"required,max=128"`
	RequestID string `json:"requestId" binding:"required,max=128"`
	Text      string `json:"text" binding:"required,max=1000"`
}
