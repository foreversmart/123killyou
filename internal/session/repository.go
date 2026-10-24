// Package session orchestrates game turns and save branches through a transaction port.
// It does not depend on Gin, SQL, or a particular speech provider.
package session

import "nightwatch/internal/game"

type Repository interface {
	Transaction(func(Transaction) error) error
}

// Transaction is the atomic boundary for progress, rewards, NPC history and request deduplication.
type Transaction interface {
	Current(string) (game.State, error)
	AutoSave() (game.State, error)
	CreateSession(game.State) error
	SaveState(game.State) error
	FindCommand(string, string, string) (StoredCommand, bool, error)
	SaveCommand(string, string, string, StoredCommand) error
	RecordEvent(string, Event) error
	AppendMemory(string, Memory) error
	Context(string) ([]Memory, []Event, error)
	Checkpoint(string, string) (SavedCheckpoint, bool, error)
	SaveCheckpoint(SavedCheckpoint) error
	CheckpointNames(string) ([]string, error)
	Fork(game.State, game.State, []Memory, []Event) error
}
