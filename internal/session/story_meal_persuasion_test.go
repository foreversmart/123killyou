package session_test

import (
	"context"
	"fmt"
	"reflect"
	"testing"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

type mealPersuasionProvider struct {
	fakeDialogueProvider
	requests []game.MealJudgeRequest
}

func (p *mealPersuasionProvider) JudgeMeal(_ context.Context, request game.MealJudgeRequest) (game.MealJudgeResult, error) {
	p.requests = append(p.requests, request)
	return game.MealJudgeResult{Decisions: map[string]game.MealDecision{
		"zhouyan": {Choice: "refused", Confidence: .95, Sincere: true},
	}}, nil
}

func (*mealPersuasionProvider) JudgeOracle(context.Context, game.OracleJudgeRequest) (game.OracleJudgeResult, error) {
	return game.OracleJudgeResult{}, nil
}

func TestMealPersuasionPlanningRetryAndSaveDoNotDuplicateAttempts(t *testing.T) {
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	provider := &mealPersuasionProvider{}
	engine := game.NewEngine(catalog)
	engine.SetStoryJudge(provider)
	service := session.New(repo, engine, provider)
	state, err := service.Create()
	if err != nil {
		t.Fatal(err)
	}
	for index, command := range []string{"登记入住", "去斋堂", "继续听", "继续听"} {
		result, err := service.Command(state.ID, state.RunID, fmt.Sprintf("meal-setup-%d", index), command)
		if err != nil {
			t.Fatal(err)
		}
		state = result.State
	}
	text := "周砚，别吃肉粥，寺里讲究清净，我们尊重这里的规矩吧。我真心担心这碗粥的来历，馒头和素菜足够填饱肚子，我愿意陪你一起吃。"
	first, err := service.Command(state.ID, state.RunID, "meal-first", text)
	if err != nil {
		t.Fatal(err)
	}
	if first.State.Flags["meal_zhouyan_refused"] || first.Speak == "" || first.State.SceneKey != "mini_refectory" {
		t.Fatalf("首次劝说应有明确回应并留在斋堂，不能直接成功: %+v", first)
	}
	if len(provider.requests) != 1 || first.State.MealPersuasion["zhouyan"].Attempts != 1 || provider.requests[0].Participants[0].PersuasionAttempts != 1 {
		t.Fatalf("plan/commit 重复调用了劝说判断: calls=%d", len(provider.requests))
	}
	replay, err := service.Command(state.ID, state.RunID, "meal-first", text)
	if err != nil || !reflect.DeepEqual(replay.State, first.State) || len(provider.requests) != 1 {
		t.Fatalf("重试同一请求重复了劝说或改变存档: replay=%+v calls=%d error=%v", replay, len(provider.requests), err)
	}
	resumed, err := service.Resume()
	if err != nil || !reflect.DeepEqual(resumed, first.State) {
		t.Fatalf("自动存档没有保留首次劝说状态: resumed=%+v err=%v", resumed, err)
	}
	second, err := service.Command(state.ID, state.RunID, "meal-second", text)
	if err != nil {
		t.Fatal(err)
	}
	if !second.State.Flags["meal_zhouyan_refused"] || second.State.MealPersuasion["zhouyan"].Attempts != 2 {
		t.Fatalf("存档后的第二次诚恳长劝说未成功，或次数被重复累计: %+v", second.State)
	}
	if len(provider.requests) != 2 || provider.requests[1].Participants[0].PersuasionAttempts != 2 {
		t.Fatalf("新请求没有且仅有一次劝说判断: calls=%d", len(provider.requests))
	}
}
