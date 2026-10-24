package session_test

import (
	"context"
	"io"
	"testing"

	"nightwatch/internal/session"
)

type recognizingProvider struct {
	fakeDialogueProvider
	text      string
	cancelled bool
}

func (p *recognizingProvider) Transcribe(ctx context.Context, source session.AudioSource, ready func() error) (string, error) {
	if ready != nil {
		if err := ready(); err != nil {
			return "", err
		}
	}
	for {
		_, err := source(ctx)
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
	}
	return p.text, nil
}
func TestRecognitionReturnsCloudTextWithoutCreatingTurn(t *testing.T) {
	p := &recognizingProvider{text: "看看地图"}
	service := audioService(t, p)
	before, _ := service.Resume()
	text, err := service.Recognize(context.Background(), before.ID, before.RunID, func(context.Context) ([]byte, error) { return nil, io.EOF }, nil)
	if err != nil || text != "看看地图" {
		t.Fatalf("missing STT %q %v", text, err)
	}
	after, _ := service.Snapshot(before.ID)
	if after.Revision != before.Revision || after.Overlay != before.Overlay {
		t.Fatal("recognition executed a game action")
	}
	if _, err = service.Recognize(context.Background(), before.ID, "old-run", nil, nil); err != session.ErrStaleRun {
		t.Fatal("stale recognition accepted")
	}
}
