// Package content loads immutable, versioned story definitions. It has no database or HTTP dependencies.
package content

type Item struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Image       string `json:"image"`
	Description string `json:"description"`
}
type Voice struct {
	Profile         string `json:"profile"`
	ProviderVoiceID string `json:"providerVoiceId"`
}
type DialogueRule struct {
	ID            string   `json:"id"`
	Keywords      []string `json:"keywords"`
	Reply         string   `json:"reply"`
	DevotionDelta int      `json:"devotionDelta"`
	Glitch        bool     `json:"glitch"`
}
type Exchange struct {
	ID            string `json:"id"`
	ItemID        string `json:"itemId"`
	RewardID      string `json:"rewardId"`
	Flag          string `json:"flag"`
	DevotionDelta int    `json:"devotionDelta"`
	Clue          string `json:"clue"`
	Reply         string `json:"reply"`
}
type NPC struct {
	ID                string         `json:"id"`
	Name              string         `json:"name"`
	Aliases           []string       `json:"aliases"`
	Room              string         `json:"room"`
	Portrait          string         `json:"portrait"`
	Voice             Voice          `json:"voice"`
	Traits            []string       `json:"traits"`
	Knowledge         []string       `json:"knowledge"`
	Prompt            string         `json:"-"`
	Intro             string         `json:"intro"`
	Return            string         `json:"return"`
	Default           string         `json:"default"`
	Reject            string         `json:"reject"`
	ExposureThreshold int            `json:"exposureThreshold"`
	ExposedReply      string         `json:"exposedReply"`
	DialogueRules     []DialogueRule `json:"dialogueRules"`
	Exchanges         []Exchange     `json:"exchanges"`
}

type World struct {
	InitialRoom     string   `json:"initialRoom"`
	InitialRoomName string   `json:"initialRoomName"`
	InitialNPC      string   `json:"initialNpc"`
	InitialDevotion int      `json:"initialDevotion"`
	StartingItems   []string `json:"startingItems"`
}
