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
			// Keep the legacy rule-test/session contract for a brand-new slot.
			// Existing development saves are migrated below, where the story
			// scene is explicitly placed at the temple gate.
			state, e = s.create(tx)
		} else if e == nil && state.SceneKey == "" {
			// Development saves created before the mini-script had no scene
			// state. Rebuild the auto slot so npm run dev opens the current
			// story instead of resuming the retired room demo.
			state, e = s.createStory(tx)
		}
		return e
	})
	return
}

func (s *Service) createStory(tx Transaction) (game.State, error) {
	state, err := s.create(tx)
	if err == nil {
		s.engine.StartMiniStory(&state)
		// create() has already persisted the initial snapshot. Replace it with
		// the story-positioned state so the next resume sees the same scene.
		err = tx.SaveState(state)
	}
	return state, err
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
