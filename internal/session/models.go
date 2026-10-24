package session

import "nightwatch/internal/game"

type Snapshot struct {
	Version      int        `json:"version"`
	StoryVersion string     `json:"storyVersion"`
	State        game.State `json:"state"`
}

type Memory struct {
	NPC      string `json:"npc"`
	Revision int    `json:"revision"`
	Player   string `json:"player"`
	Reply    string `json:"reply"`
}

type Event struct {
	ID       string `json:"id"`
	Revision int    `json:"revision"`
}

type Checkpoint struct {
	Snapshot Snapshot `json:"snapshot"`
	Memories []Memory `json:"memories"`
	Events   []Event  `json:"events"`
}

type SavedCheckpoint struct {
	Name, SessionID, SourceRun, CreatedAt string
	Data                                  Checkpoint
}
type StoredCommand struct {
	InputHash string
	Result    game.Result
}
