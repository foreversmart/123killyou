// Package linx adapts the Qiniu 灵矽 platform APIs used by the game.
//
// Linx is required for NPC wording and all turn audio. Game rules remain
// authoritative: explicit actions commit before narration, while open NPC
// dialogue commits after the cloud returns usable wording and speech.
package linx

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	DefaultAPIBase = "https://xrobo.qiniu.com"
	DefaultWSURL   = "wss://xrobo-io.qiniuapi.com/v1/ws/"
	DefaultOTAURL  = "https://xrobo.qiniuapi.com/v1/ota/"
	DefaultModelID = "f3626c105383d71654a57f2bb8a973f3"
	DefaultVoiceID = "2e7965636b0d4472ae51e75f419dff41"
)

type Config struct {
	APIKey       string
	APIBase      string
	WSURL        string
	DeviceID     string
	DeviceFile   string
	OTAURL       string
	KeeperAgent  string
	RequestLimit time.Duration
}

func (c Config) Enabled() bool { return strings.TrimSpace(c.APIKey) != "" }

type AgentSpec struct {
	Name          string
	AssistantName string
	VoiceID       string
	ModelID       string
	SystemPrompt  string
}

type Agent struct {
	ID            string `json:"id"`
	AgentName     string `json:"agentName"`
	AssistantName string `json:"assistantName"`
}

type Client struct {
	config     Config
	httpClient *http.Client
	mu         sync.RWMutex
	identity   DeviceIdentity
	device     DeviceStatus
	access     deviceAccess
	accessAt   time.Time
	turns      chan struct{}
}

func New(config Config) *Client {
	if config.APIBase == "" {
		config.APIBase = DefaultAPIBase
	}
	if config.RequestLimit <= 0 {
		config.RequestLimit = 20 * time.Second
	}
	if config.OTAURL == "" {
		config.OTAURL = DefaultOTAURL
	}
	if config.DeviceFile == "" {
		config.DeviceFile = ".local/linx/device.json"
	}
	return &Client{
		config:     config,
		httpClient: &http.Client{Timeout: config.RequestLimit},
		turns:      make(chan struct{}, 1),
	}
}

func (c *Client) Configured() bool { return c != nil && c.config.Enabled() }

func (c *Client) SetKeeperAgent(id string) {
	if c != nil {
		c.mu.Lock()
		defer c.mu.Unlock()
		c.config.KeeperAgent = strings.TrimSpace(id)
	}
}

type envelope struct {
	Code       int             `json:"code"`
	Msg        string          `json:"msg"`
	Data       json.RawMessage `json:"data"`
	NextCursor string          `json:"nextCursor"`
}

func (c *Client) request(ctx context.Context, method, path string, body any, out any) error {
	_, err := c.requestWithMeta(ctx, method, path, body, out)
	return err
}

func (c *Client) requestWithMeta(ctx context.Context, method, path string, body any, out any) (string, error) {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return "", err
		}
		reader = strings.NewReader(string(raw))
	}
	req, err := http.NewRequestWithContext(ctx, method, strings.TrimRight(c.config.APIBase, "/")+path, reader)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("linx api request: %w", err)
	}
	defer resp.Body.Close()
	var result envelope
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("linx api response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 || (result.Code != 0 && result.Code != 200) {
		if result.Msg == "" {
			result.Msg = http.StatusText(resp.StatusCode)
		}
		return "", fmt.Errorf("linx api rejected request: %s", result.Msg)
	}
	if out == nil || len(result.Data) == 0 || string(result.Data) == "null" {
		return result.NextCursor, nil
	}
	if err := json.Unmarshal(result.Data, out); err != nil {
		return "", fmt.Errorf("linx api data: %w", err)
	}
	return result.NextCursor, nil
}
