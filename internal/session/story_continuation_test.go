package session_test

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"

	"nightwatch/internal/session"
)

func arrivalHandoff(t *testing.T, service *session.Service) (stateID, runID string) {
	t.Helper()
	state, err := service.Create()
	if err != nil {
		t.Fatal(err)
	}
	for turn := 0; state.DialogueNext != "自动登记入住"; turn++ {
		if turn > 10 || state.DialogueNext == "" {
			t.Fatalf("山门对白没有接到登记: %+v", state)
		}
		result, err := service.Command(state.ID, state.RunID, fmt.Sprintf("intro-%d", turn), state.DialogueNext)
		if err != nil {
			t.Fatal(err)
		}
		state = result.State
	}
	return state.ID, state.RunID
}

func TestStoryConversationKeepsSavedSafeHandoffAndReplaysOnce(t *testing.T) {
	provider := &fakeDialogueProvider{text: "是呀，檐角在阳光下很好看，我们边走边看。"}
	service, _ := storyConversationService(t, provider)
	id, runID := arrivalHandoff(t, service)
	before, err := service.Snapshot(id)
	if err != nil {
		t.Fatal(err)
	}
	text := "许栀，这里的檐角真漂亮"
	var start session.SpeechEvent
	result, err := service.CommandStream(context.Background(), id, runID, "safe-response", text, func(event session.SpeechEvent) error {
		if event.Kind == "start" {
			start = event
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Speak != provider.text || result.SpeakerID != "xuzhi" || start.Speaker != "许栀" || !result.HasAudio {
		t.Fatalf("附和没有使用许栀的真实回应与音色: %+v %+v", result, start)
	}
	if result.State.DialogueNext != before.DialogueNext || result.State.SceneKey != before.SceneKey || result.State.ShotKey != before.ShotKey || !reflect.DeepEqual(result.State.Flags, before.Flags) {
		t.Fatalf("回应没有保留原有安全串联: before=%+v after=%+v", before, result.State)
	}
	for _, constraint := range []string{"一两句", "先回答玩家的问题", "宣称已经转场", "追加要求玩家回答的问题"} {
		if !strings.Contains(provider.seen.GameContext, constraint) {
			t.Fatalf("缺少简短接话约束 %q: %s", constraint, provider.seen.GameContext)
		}
	}
	saved, err := service.Snapshot(id)
	if err != nil || !reflect.DeepEqual(saved, result.State) {
		t.Fatalf("安全串联没有保存: %+v %v", saved, err)
	}
	replay, err := service.Command(id, runID, "safe-response", text)
	if err != nil || replay.State.Revision != result.State.Revision || provider.calls != 1 {
		t.Fatalf("重放重复了生成或推进: %+v calls=%d error=%v", replay, provider.calls, err)
	}
	next, err := service.Command(id, runID, "safe-handoff", saved.DialogueNext)
	if err != nil || next.State.SceneKey != "mini_register" || next.State.Dialogue.Speaker != "陆沉" {
		t.Fatalf("回应后没有由陆沉接到登记: %+v %v", next, err)
	}
	if provider.calls != 1 {
		t.Fatal("登记固定台词不应重新生成")
	}
}

func TestStoryFailedResponseKeepsPendingSafeHandoff(t *testing.T) {
	for _, failure := range []error{nil, errors.New("cloud timeout")} {
		provider := &fakeDialogueProvider{}
		service, _ := storyConversationService(t, provider)
		id, runID := arrivalHandoff(t, service)
		before, err := service.Snapshot(id)
		if err != nil {
			t.Fatal(err)
		}
		provider.err = failure
		_, err = service.Command(id, runID, "failed-response", "许栀，这里的檐角真漂亮")
		if !errors.Is(err, session.ErrLinxUnavailable) {
			t.Fatalf("失败回应没有明确反馈: %v", err)
		}
		after, err := service.Snapshot(id)
		if err != nil || !reflect.DeepEqual(after, before) || after.DialogueNext != "自动登记入住" {
			t.Fatalf("失败回应改变了待串联存档: %+v %v", after, err)
		}
	}
}

func TestStoryDangerConversationDoesNotResumePendingScripture(t *testing.T) {
	provider := &fakeDialogueProvider{text: "你先缓一缓，我听着。"}
	service, initial := storyConversationService(t, provider)
	state := initial
	for turn := 0; state.SceneKey != "mini_double"; turn++ {
		if turn > 12 {
			t.Fatal("未进入换皮同伴场景")
		}
		result, err := service.Command(state.ID, state.RunID, fmt.Sprintf("skip-%d", turn), "调试跳到下一剧情场景")
		if err != nil {
			t.Fatal(err)
		}
		state = result.State
	}
	started, err := service.Command(state.ID, state.RunID, "start-scripture", "朗读经文")
	if err != nil || started.State.DialogueNext != "继续念经" {
		t.Fatalf("经文前置错误: %+v %v", started, err)
	}
	before := started.State
	result, err := service.Command(state.ID, state.RunID, "danger-response", "我有点紧张")
	if err != nil || result.Speak != provider.text || result.State.DialogueNext != "" {
		t.Fatalf("危险问答不应恢复自动念经: %+v %v", result, err)
	}
	if !reflect.DeepEqual(result.State.Flags, before.Flags) || result.State.ShotKey != before.ShotKey || result.State.SceneKey != before.SceneKey {
		t.Fatal("危险问答改变了经文或危险选择")
	}
	if strings.Contains(provider.seen.GameContext, "已保留既定安全串联") {
		t.Fatal("危险场景不应收到安全串联提示")
	}
}
