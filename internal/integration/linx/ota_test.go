package linx

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestOTAActivationBindsOnlyProjectAgentAndUsesDeviceToken(t *testing.T) {
	bound, reports := false, 0
	var identity DeviceIdentity
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/ota/":
			reports++
			if r.Header.Get("Authorization") != "" {
				t.Error("OTA leaked management API key")
			}
			if r.Header.Get("Activation-Version") != "1" || r.Header.Get("User-Agent") == "" {
				t.Error("OTA headers incomplete")
			}
			if reports == 1 {
				identity = DeviceIdentity{r.Header.Get("Device-Id"), r.Header.Get("Client-Id")}
			}
			if r.Header.Get("Device-Id") != identity.DeviceID || r.Header.Get("Client-Id") != identity.ClientID {
				t.Error("OTA identity changed")
			}
			var body struct {
				MAC  string `json:"mac_address"`
				UUID string `json:"uuid"`
			}
			if json.NewDecoder(r.Body).Decode(&body) != nil || body.MAC != identity.DeviceID || body.UUID != identity.ClientID {
				t.Error("OTA body/header mismatch")
			}
			if !bound {
				w.Write([]byte(`{"activation":{"code":"012345"},"websocket":{"url":"ws://xrobo-io.qiniuapi.com/v1/ws/"}}`))
			} else {
				w.Write([]byte(`{"websocket":{"url":"ws://xrobo-io.qiniuapi.com/v1/ws/","token":"device-token"}}`))
			}
		case "/xiaozhi/agent/keeper-agent":
			if r.Header.Get("Authorization") != "Bearer management-key" {
				t.Error("missing management authentication")
			}
			w.Write([]byte(`{"code":0,"data":{"id":"keeper-agent","agentName":"1024-keeper"}}`))
		case "/xiaozhi/device/bind/keeper-agent/012345":
			if r.Method != "POST" {
				t.Error("binding did not POST")
			}
			bound = true
			w.Write([]byte(`{"code":0}`))
		case "/xiaozhi/device/bind/keeper-agent":
			json.NewEncoder(w).Encode(map[string]any{"code": 0, "data": []any{map[string]string{"macAddress": identity.DeviceID}}})
		default:
			t.Errorf("unexpected path %s", r.URL.Path)
			http.NotFound(w, r)
		}
	}))
	defer server.Close()
	config := Config{APIKey: "management-key", APIBase: server.URL, OTAURL: server.URL + "/ota/", KeeperAgent: "keeper-agent", DeviceFile: filepath.Join(t.TempDir(), "device.json")}
	client := New(config)
	if err := client.PrepareDevice(context.Background()); err != nil {
		t.Fatal(err)
	}
	if !bound || reports != 2 || client.access.Token != "device-token" || !strings.HasPrefix(client.access.URL, "wss://") {
		t.Fatal("activation did not produce safe device credentials")
	}
	if status := client.DeviceStatus(); !status.Bound || status.Connected {
		t.Fatal("activation is not evidence of cloud replies")
	}
	restarted := New(config)
	if err := restarted.PrepareDevice(context.Background()); err != nil {
		t.Fatal(err)
	}
	if restarted.identity != client.identity {
		t.Fatal("restart lost identity")
	}
}

func TestOTARejectsBusinessErrorsAndMissingTokens(t *testing.T) {
	for _, body := range []string{`{"error":"Invalid OTA request"}`, `{"code":500,"msg":"error"}`, `{"websocket":{"url":"wss://example.test"}}`, `not JSON`} {
		t.Run(body, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if strings.HasPrefix(r.URL.Path, "/xiaozhi/agent/") {
					w.Write([]byte(`{"code":0,"data":{"id":"agent","agentName":"1024-keeper"}}`))
					return
				}
				w.Write([]byte(body))
			}))
			defer server.Close()
			c := New(Config{APIKey: "key", APIBase: server.URL, OTAURL: server.URL, KeeperAgent: "agent", DeviceFile: filepath.Join(t.TempDir(), "device.json"), RequestLimit: time.Second})
			if err := c.PrepareDevice(context.Background()); err == nil {
				t.Fatal("invalid OTA response accepted")
			}
			if c.DeviceStatus().Bound || c.DeviceStatus().Connected {
				t.Fatal("failed OTA was reported as connected")
			}
		})
	}
}

func TestBindRejectsUnrelatedAgent(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.Write([]byte(`{"code":0,"data":{"id":"agent","agentName":"someone-elses-agent"}}`))
	}))
	defer server.Close()
	c := New(Config{APIKey: "key", APIBase: server.URL})
	if c.bindDevice(context.Background(), "agent", "123456") == nil || calls != 1 {
		t.Fatal("unrelated agent was eligible for binding")
	}
	for _, code := range []string{"12345", "../other", "1234567"} {
		if c.bindDevice(context.Background(), "agent", code) == nil {
			t.Fatal("invalid activation code accepted")
		}
	}
	if calls != 1 {
		t.Fatal("invalid activation code caused network calls")
	}
}

func TestWebSocketEndpointRequiresTLS(t *testing.T) {
	for _, raw := range []string{"ws://example.com", "https://example.com", "wss://user:pass@example.com"} {
		if _, err := secureWebSocketURL(raw); err == nil {
			t.Fatalf("unsafe endpoint accepted: %s", raw)
		}
	}
}
