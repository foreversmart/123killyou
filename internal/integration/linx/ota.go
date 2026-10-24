package linx

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"nightwatch/internal/session"
)

type deviceAccess struct {
	URL   string `json:"url"`
	Token string `json:"token"`
}

// DeviceStatus is safe for local diagnostics: never include identity or tokens.
type DeviceStatus struct {
	State       string `json:"state"`
	Bound       bool   `json:"bound"`
	Connected   bool   `json:"connected"`
	LastReplyAt string `json:"lastReplyAt,omitempty"`
	LastError   string `json:"lastError,omitempty"`
}

type otaResponse struct {
	Activation struct {
		Code string `json:"code"`
	} `json:"activation"`
	WebSocket deviceAccess `json:"websocket"`
	Error     string       `json:"error"`
	Code      int          `json:"code"`
}

// PrepareDevice registers this installation and binds only the configured test
// agent. The management key is never used as a WebSocket device token.
func (c *Client) PrepareDevice(ctx context.Context) error {
	identity, err := loadIdentity(c.config.DeviceFile, c.config.DeviceID)
	if err != nil {
		return c.deviceFailure("identity_invalid", err)
	}
	c.mu.Lock()
	c.identity = identity
	c.device = DeviceStatus{State: "activating"}
	agentID := c.config.KeeperAgent
	c.mu.Unlock()
	if agentID == "" {
		return c.deviceFailure("agent_missing", errors.New("linx test agent is not configured"))
	}
	if err := c.verifyTestAgent(ctx, agentID); err != nil {
		return c.deviceFailure("agent_invalid", err)
	}
	response, err := c.reportOTA(ctx, identity)
	if err != nil {
		return c.deviceFailure("ota_failed", err)
	}
	if response.Activation.Code != "" {
		if err := c.bindDevice(ctx, agentID, response.Activation.Code); err != nil {
			return c.deviceFailure("binding_failed", err)
		}
		response, err = c.reportOTA(ctx, identity)
		if err != nil {
			return c.deviceFailure("ota_failed", err)
		}
	}
	if strings.TrimSpace(response.WebSocket.Token) == "" {
		return c.deviceFailure("unbound", errors.New("linx OTA did not provide a bound device token"))
	}
	if err := c.verifyBinding(ctx, agentID, identity.DeviceID); err != nil {
		return c.deviceFailure("binding_mismatch", err)
	}
	wsURL := response.WebSocket.URL
	if c.config.WSURL != "" {
		wsURL = c.config.WSURL
	}
	wsURL, err = secureWebSocketURL(wsURL)
	if err != nil {
		return c.deviceFailure("endpoint_invalid", err)
	}
	c.mu.Lock()
	c.access = deviceAccess{URL: wsURL, Token: response.WebSocket.Token}
	c.accessAt = time.Now()
	c.device = DeviceStatus{State: "ready", Bound: true}
	c.mu.Unlock()
	return nil
}

func (c *Client) reportOTA(ctx context.Context, identity DeviceIdentity) (otaResponse, error) {
	body := map[string]any{
		"version": 0, "mac_address": identity.DeviceID, "uuid": identity.ClientID,
		"application": map[string]any{"name": "1024-nightwatch", "version": "0.1.0", "elf_sha256": strings.Repeat("0", 64)},
		"board":       map[string]any{"type": "1024-nightwatch-web", "mac": identity.DeviceID},
		"flash_size":  0,
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.config.OTAURL, strings.NewReader(string(mustJSON(body))))
	if err != nil {
		return otaResponse{}, errors.New("linx OTA endpoint is invalid")
	}
	req.Header.Set("Activation-Version", "1")
	req.Header.Set("Device-Id", identity.DeviceID)
	req.Header.Set("Client-Id", identity.ClientID)
	req.Header.Set("User-Agent", "1024-nightwatch/0.1.0")
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return otaResponse{}, errors.New("linx OTA network request failed")
	}
	defer resp.Body.Close()
	var result otaResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, 64<<10)).Decode(&result); err != nil {
		return result, errors.New("linx OTA returned invalid JSON")
	}
	if resp.StatusCode != http.StatusOK || result.Error != "" || (result.Code != 0 && result.Code != 200) {
		return result, fmt.Errorf("linx OTA rejected registration (HTTP %d)", resp.StatusCode)
	}
	return result, nil
}

func (c *Client) DeviceStatus() DeviceStatus {
	if c == nil {
		return DeviceStatus{State: "disabled"}
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	status := c.device
	if status.State == "" {
		status.State = "uninitialized"
	}
	return status
}

func (c *Client) DialogueStatus() session.DialogueStatus {
	status := c.DeviceStatus()
	return session.DialogueStatus{State: status.State, Bound: status.Bound, Verified: status.Connected, LastReplyAt: status.LastReplyAt, LastError: status.LastError}
}

func (c *Client) deviceFailure(state string, err error) error {
	c.mu.Lock()
	c.device.State, c.device.Connected, c.device.LastError = state, false, state
	c.accessAt = time.Time{}
	c.mu.Unlock()
	return err
}

func (c *Client) recordReply() {
	c.mu.Lock()
	c.device.State, c.device.Connected, c.device.LastError = "verified", true, ""
	c.device.LastReplyAt = time.Now().UTC().Format(time.RFC3339)
	c.mu.Unlock()
}

func secureWebSocketURL(raw string) (string, error) {
	u, err := url.Parse(raw)
	if err != nil || u.User != nil || u.Host == "" {
		return "", errors.New("linx OTA returned an invalid websocket endpoint")
	}
	if u.Scheme == "ws" && u.Hostname() == "xrobo-io.qiniuapi.com" {
		u.Scheme = "wss"
	}
	local := u.Hostname() == "127.0.0.1" || u.Hostname() == "localhost" || u.Hostname() == "::1"
	if u.Scheme != "wss" && !(u.Scheme == "ws" && local) {
		return "", errors.New("linx websocket requires TLS outside localhost")
	}
	return u.String(), nil
}
