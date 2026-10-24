package linx

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

var activationCode = regexp.MustCompile(`^\d{6}$`)

// Verify the exact ID/name before binding. Never move or unbind another device.
func (c *Client) verifyTestAgent(ctx context.Context, agentID string) error {
	var agent Agent
	if err := c.request(ctx, http.MethodGet, "/xiaozhi/agent/"+url.PathEscape(agentID), nil, &agent); err != nil {
		return err
	}
	if agent.ID != agentID || agent.AgentName != "1024-keeper" {
		return errors.New("linx device may only bind to this project's 1024-keeper agent")
	}
	return nil
}

func (c *Client) bindDevice(ctx context.Context, agentID, code string) error {
	if !activationCode.MatchString(code) {
		return errors.New("linx OTA returned an invalid activation code")
	}
	if err := c.verifyTestAgent(ctx, agentID); err != nil {
		return err
	}
	return c.request(ctx, http.MethodPost, "/xiaozhi/device/bind/"+url.PathEscape(agentID)+"/"+code, nil, nil)
}

func (c *Client) verifyBinding(ctx context.Context, agentID, deviceID string) error {
	var devices []struct {
		MAC string `json:"macAddress"`
	}
	if err := c.request(ctx, http.MethodGet, "/xiaozhi/device/bind/"+url.PathEscape(agentID), nil, &devices); err != nil {
		return err
	}
	for _, device := range devices {
		if strings.EqualFold(device.MAC, deviceID) {
			return nil
		}
	}
	return errors.New("linx virtual device is not bound to the configured test agent")
}
