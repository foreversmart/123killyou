package content

import (
	"fmt"
	"io/fs"
	"strings"
)

// Narrator is a voice role, not an NPC or a source of game rules.
type Narrator struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Voice  Voice  `json:"voice"`
	Prompt string `json:"-"`
}

func (c *Catalog) loadNarrator(source fs.FS) error {
	if err := readJSON(source, "narrator/profile.json", &c.narrator); err != nil {
		return err
	}
	if c.narrator.ID != "narrator" || !hasText(c.narrator.Name, c.narrator.Voice.Profile, c.narrator.Voice.ProviderVoiceID) {
		return fmt.Errorf("旁白配置不完整或 ID 无效")
	}
	raw, err := fs.ReadFile(source, "narrator/prompt.md")
	if err != nil {
		return err
	}
	c.narrator.Prompt = strings.TrimSpace(string(raw))
	if c.narrator.Prompt == "" {
		return fmt.Errorf("旁白提示词为空")
	}
	return nil
}

func (c *Catalog) Narrator() Narrator { return c.narrator }
