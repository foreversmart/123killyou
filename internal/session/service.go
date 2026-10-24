package session

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"

	"nightwatch/internal/game"
)

type Service struct {
	repository Repository
	engine     *game.Engine
	provider   DialogueProvider
	locksMu    sync.Mutex
	locks      map[string]*commandLock
	audioMu    sync.Mutex
	audio      map[audioKey]cachedAudio
}

func New(repository Repository, engine *game.Engine, provider DialogueProvider) *Service {
	return &Service{repository: repository, engine: engine, provider: provider}
}

func (s *Service) LinxConnected() bool { return s.DialogueStatus().Verified }

func (s *Service) SpeechProvider() string {
	if s.provider != nil {
		return "linx"
	}
	return "unavailable"
}
func newID() string {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		panic(err)
	}
	return hex.EncodeToString(bytes[:])
}
func now() string { return time.Now().UTC().Format(time.RFC3339Nano) }
func (s *Service) create(tx Transaction) (game.State, error) {
	state := s.engine.Initial(newID())
	state.RunID = newID()
	state.SavedAt = now()
	return state, tx.CreateSession(state)
}
func (s *Service) Create() (state game.State, err error) {
	err = s.repository.Transaction(func(tx Transaction) error { var e error; state, e = s.create(tx); return e })
	return
}
func (s *Service) Resume() (state game.State, err error) {
	err = s.repository.Transaction(func(tx Transaction) error {
		var e error
		state, e = tx.AutoSave()
		if errors.Is(e, ErrSession) {
			state, e = s.create(tx)
		}
		return e
	})
	return
}
func (s *Service) Snapshot(id string) (state game.State, err error) {
	err = s.repository.Transaction(func(tx Transaction) error { var e error; state, e = tx.Current(id); return e })
	return
}
func feedback(state *game.State, text string) string {
	state.Dialogue = game.Dialogue{Speaker: "系统", Text: text}
	state.LastAction = text
	return text
}
func (s *Service) fork(tx Transaction, next *game.State, before game.State, memories []Memory, events []Event) error {
	next.ID, next.RunID, next.Revision = before.ID, newID(), before.Revision+1
	next.Effect = game.Effect{Kind: "none"}
	next.Overlay, next.FocusItem = "", ""
	return tx.Fork(before, *next, memories, events)
}
