package linx

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/coder/websocket"
)

// connect keeps device credentials on the server for both input and output.
func (c *Client) connect(ctx context.Context, gameContext, agentID string) (*websocket.Conn, wireEvent, error) {
	c.mu.RLock()
	refresh := c.access.Token == "" || time.Since(c.accessAt) > 10*time.Minute
	c.mu.RUnlock()
	if refresh {
		if err := c.PrepareDevice(ctx); err != nil {
			return nil, wireEvent{}, err
		}
	}
	c.mu.RLock()
	access, identity := c.access, c.identity
	c.mu.RUnlock()
	if access.Token == "" || identity.ClientID == "" {
		return nil, wireEvent{}, errors.New("linx virtual device has not completed OTA activation")
	}
	conn, _, err := websocket.Dial(ctx, access.URL, &websocket.DialOptions{HTTPHeader: http.Header{
		"Authorization": {"Bearer " + access.Token}, "Protocol-Version": {"1"},
		"Device-Id": {identity.DeviceID}, "Client-Id": {identity.ClientID},
		"X-Agent-ID": {agentID},
	}})
	if err != nil {
		return nil, wireEvent{}, fmt.Errorf("linx websocket: %w", err)
	}
	if err = conn.Write(ctx, websocket.MessageText, mustJSON(clientHello(gameContext))); err != nil {
		conn.CloseNow()
		return nil, wireEvent{}, fmt.Errorf("linx hello: %w", err)
	}
	hello, err := readHello(ctx, conn)
	if err != nil {
		conn.CloseNow()
		return nil, wireEvent{}, err
	}
	// X-Agent-ID selects the role; the documented hello response need not echo
	// it. Reject an explicit mismatch, but accept a valid hello without the ID.
	if agentID != "" && hello.AgentID != "" && hello.AgentID != agentID {
		conn.CloseNow()
		return nil, wireEvent{}, errors.New("linx did not confirm the requested agent")
	}
	return conn, hello, nil
}
