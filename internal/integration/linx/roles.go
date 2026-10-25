package linx

import (
	"errors"
	"strings"
)

// SetRoleAgents registers only this project's prepared voices. The virtual
// device stays bound to keeper; each turn selects its speaker at handshake.
func (c *Client) SetRoleAgents(roles map[string]string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.config.RoleAgents = make(map[string]string, len(roles))
	for role, id := range roles {
		c.config.RoleAgents[strings.TrimSpace(role)] = strings.TrimSpace(id)
	}
	if id := roles["keeper"]; id != "" {
		c.config.KeeperAgent = id
	}
	if id := roles["narrator"]; id != "" {
		c.config.NarratorAgent = id
	}
}

func (c *Client) agentForRole(role string) (string, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	id := c.config.RoleAgents[role]
	switch role {
	case "", "narrator":
		id = c.config.NarratorAgent
	case "keeper":
		id = c.config.KeeperAgent
	}
	if id == "" {
		return "", errors.New("linx voice role is not configured")
	}
	return id, nil
}

func (c *Client) projectAgent(id string) bool {
	if id == "" {
		return false
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	if id == c.config.KeeperAgent || id == c.config.NarratorAgent {
		return true
	}
	for _, agentID := range c.config.RoleAgents {
		if id == agentID {
			return true
		}
	}
	return false
}
