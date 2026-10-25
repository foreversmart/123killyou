package session_test

import (
	"context"
	"testing"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

type optionFallbackJudge struct {
	optionCalls int
}

func (j *optionFallbackJudge) JudgeMeal(context.Context, game.MealJudgeRequest) (game.MealJudgeResult, error) {
	return game.MealJudgeResult{}, nil
}

func (j *optionFallbackJudge) JudgeOracle(context.Context, game.OracleJudgeRequest) (game.OracleJudgeResult, error) {
	return game.OracleJudgeResult{}, nil
}

func (j *optionFallbackJudge) JudgeOption(_ context.Context, request game.OptionJudgeRequest) (game.OptionJudgeResult, error) {
	j.optionCalls++
	if len(request.Options) == 0 {
		return game.OptionJudgeResult{}, nil
	}
	return game.OptionJudgeResult{Choice: "listen", Confidence: .9}, nil
}

func TestUnmatchedVoiceUsesJEVChoiceToExecuteCurrentOption(t *testing.T) {
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	engine := game.NewEngine(catalog)
	judge := &optionFallbackJudge{}
	engine.SetStoryJudge(judge)
	provider := &fakeDialogueProvider{}
	service := session.New(repo, engine, provider)
	state, err := service.Create()
	if err != nil {
		t.Fatal(err)
	}
	state.SceneKey = "mini_three_knocks"
	state.ShotKey = "three_knocks"
	if err := repo.Transaction(func(tx session.Transaction) error { return tx.SaveState(state) }); err != nil {
		t.Fatal(err)
	}
	result, err := service.Command(state.ID, state.RunID, "jev-option", "我想跟着他去看看")
	if err != nil {
		t.Fatal(err)
	}
	if judge.optionCalls != 1 || result.Intent != "move" || result.State.SceneKey != "mini_listen" {
		t.Fatalf("unmatched voice did not execute constrained option: calls=%d result=%+v", judge.optionCalls, result)
	}
	if result.State.LastHeard != "我想跟着他去看看" {
		t.Fatalf("original transcript was not preserved: %+v", result.State)
	}
}
