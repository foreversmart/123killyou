package content

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"path"
	"regexp"
	"sort"
	"strings"
)

//go:embed world.json items.json npcs/*/profile.json npcs/*/prompt.md narrator/profile.json narrator/prompt.md
var files embed.FS

type Catalog struct {
	world    World
	items    map[string]Item
	npcs     map[string]NPC
	npcIDs   []string
	narrator Narrator
}

var validID = regexp.MustCompile(`^[a-z][a-z0-9_-]*$`)

func Load() (*Catalog, error) { return LoadFS(files) }

// LoadFS also supports validating a separate content pack before wiring it into the game.
func LoadFS(source fs.FS) (*Catalog, error) {
	c := &Catalog{items: map[string]Item{}, npcs: map[string]NPC{}}
	if err := c.loadNarrator(source); err != nil {
		return nil, err
	}
	var items []Item
	if err := readJSON(source, "items.json", &items); err != nil {
		return nil, err
	}
	for _, item := range items {
		if !validID.MatchString(item.ID) || !hasText(item.Name, item.Image, item.Description) {
			return nil, fmt.Errorf("物品配置不完整: %q", item.ID)
		}
		if _, exists := c.items[item.ID]; exists {
			return nil, fmt.Errorf("物品 ID 重复: %s", item.ID)
		}
		c.items[item.ID] = item
	}
	profiles, err := fs.Glob(source, "npcs/*/profile.json")
	if err != nil {
		return nil, err
	}
	if len(profiles) == 0 {
		return nil, fmt.Errorf("没有 NPC 配置")
	}
	for _, file := range profiles {
		var npc NPC
		if err := readJSON(source, file, &npc); err != nil {
			return nil, err
		}
		if !validID.MatchString(npc.ID) || path.Base(path.Dir(file)) != npc.ID ||
			!hasText(npc.Name, npc.Room, npc.Portrait, npc.Voice.Profile, npc.Intro, npc.Return, npc.Reject, npc.ExposedReply) ||
			len(npc.Traits) == 0 || !hasText(npc.Traits...) || !hasText(npc.Aliases...) {
			return nil, fmt.Errorf("NPC 配置不完整或目录 ID 不符: %s", file)
		}
		if _, exists := c.npcs[npc.ID]; exists {
			return nil, fmt.Errorf("NPC ID 重复: %s", npc.ID)
		}
		prompt, err := fs.ReadFile(source, path.Join(path.Dir(file), "prompt.md"))
		if err != nil {
			return nil, err
		}
		npc.Prompt = strings.TrimSpace(string(prompt))
		if npc.Prompt == "" {
			return nil, fmt.Errorf("NPC 提示词为空: %s", npc.ID)
		}
		ids := map[string]bool{}
		for _, rule := range npc.DialogueRules {
			if rule.ID == "" || ids[rule.ID] || len(rule.Keywords) == 0 || !hasText(rule.Keywords...) || !hasText(rule.Reply) {
				return nil, fmt.Errorf("NPC 对话规则无效: %s/%s", npc.ID, rule.ID)
			}
			ids[rule.ID] = true
		}
		for _, exchange := range npc.Exchanges {
			_, hasItem := c.items[exchange.ItemID]
			_, hasReward := c.items[exchange.RewardID]
			if exchange.ID == "" || ids[exchange.ID] || !hasText(exchange.Flag, exchange.Reply, exchange.Clue) || !hasItem || !hasReward {
				return nil, fmt.Errorf("NPC 道具交换引用无效: %s/%s", npc.ID, exchange.ID)
			}
			ids[exchange.ID] = true
		}
		c.npcs[npc.ID] = npc
		c.npcIDs = append(c.npcIDs, npc.ID)
	}
	if err := readJSON(source, "world.json", &c.world); err != nil {
		return nil, err
	}
	initial, exists := c.npcs[c.world.InitialNPC]
	if !exists || initial.Room != c.world.InitialRoom || !hasText(c.world.InitialRoomName) || c.world.InitialDevotion < 0 || c.world.InitialDevotion > 100 {
		return nil, fmt.Errorf("初始世界配置无效")
	}
	for _, id := range c.world.StartingItems {
		if _, exists := c.items[id]; !exists {
			return nil, fmt.Errorf("初始物品不存在: %s", id)
		}
	}
	sort.Strings(c.npcIDs)
	return c, nil
}

func hasText(values ...string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) == "" {
			return false
		}
	}
	return true
}

func readJSON(source fs.FS, name string, target any) error {
	data, err := fs.ReadFile(source, name)
	if err != nil {
		return err
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("%s: %w", name, err)
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return fmt.Errorf("%s: 文件含多余 JSON 内容", name)
	}
	return nil
}
func (c *Catalog) Item(id string) (Item, bool) { item, ok := c.items[id]; return item, ok }
func (c *Catalog) NPC(id string) (NPC, bool)   { npc, ok := c.npcs[id]; return npc, ok }
func (c *Catalog) NPCs() []NPC {
	out := make([]NPC, 0, len(c.npcIDs))
	for _, id := range c.npcIDs {
		out = append(out, c.npcs[id])
	}
	return out
}

func (c *Catalog) World() World { return c.world }
