package linx

import (
	"context"
	"fmt"
	"net/http"
)

// ValidateVoices checks configured IDs against the authenticated platform
// catalog. An unavailable role cannot silently borrow the default voice.
func (c *Client) ValidateVoices(ctx context.Context, roles map[string]string) error {
	var result struct {
		Voices []struct {
			ID string `json:"id"`
		} `json:"voices"`
	}
	if err := c.request(ctx, http.MethodGet, "/v1/voices", nil, &result); err != nil {
		return fmt.Errorf("linx voice catalog: %w", err)
	}
	available := make(map[string]bool, len(result.Voices))
	for _, voice := range result.Voices {
		available[voice.ID] = true
	}
	used := make(map[string]string, len(roles))
	for role, id := range roles {
		if id == "" || !available[id] {
			return fmt.Errorf("linx voice for %s is unavailable", role)
		}
		if other := used[id]; other != "" {
			return fmt.Errorf("linx roles %s and %s must have distinct voices", other, role)
		}
		used[id] = role
	}
	return nil
}
