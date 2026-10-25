package session_test

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

func storyConversationService(t *testing.T, provider *fakeDialogueProvider) (*session.Service, game.State) {
	t.Helper()
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { repo.Close() })
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	service := session.New(repo, game.NewEngine(catalog), provider)
	state, err := service.Create()
	if err != nil {
		t.Fatal(err)
	}
	return service, state
}

func TestStoryUnmatchedSpeechUsesFreshNPCResponseAndRecentContext(t *testing.T) {
	provider := &fakeDialogueProvider{text: "飞船我可拍不到。你是想聊星星，还是想问我的相机？"}
	service, before := storyConversationService(t, provider)
	text := "林岚，你知道宇宙飞船吗？"
	var events []session.SpeechEvent
	result, err := service.CommandStream(context.Background(), before.ID, before.RunID, "new-question", text, func(event session.SpeechEvent) error {
		events = append(events, event)
		return nil
	})
	if err != nil || result.Speak != provider.text || result.State.Dialogue.Speaker != "林岚" || result.SpeakerID != "linlan" {
		t.Fatalf("闲聊未自然回应：%+v %v", result, err)
	}
	if provider.calls != 1 || provider.seen.PlayerText != text || provider.seen.RuleReply != "" || provider.seen.OnSpeech != nil {
		t.Fatal("未将原始问题交给 NPC，或未校验就播出了回答")
	}
	if len(events) < 3 || events[0].Speaker != "林岚" || events[1].Text != provider.text || !result.HasAudio {
		t.Fatal("生成后的回答没有以角色自己的声音播出")
	}
	if !reflect.DeepEqual(result.State.Flags, before.Flags) || result.State.SceneKey != before.SceneKey || result.State.ShotKey != before.ShotKey || result.State.Devotion != before.Devotion || result.State.DialogueNext != before.DialogueNext {
		t.Fatal("闲聊推进了故事")
	}
	provider.text = "我没听懂你说的那个词。你是想问相机吗？"
	_, err = service.Command(before.ID, before.RunID, "clarify-question", "林岚，咕噜叽里呱啦abcxyz")
	if err != nil {
		t.Fatal(err)
	}
	for _, fact := range []string{"此前问答", "宇宙飞船", result.Speak, "当前场景", "晴天下午", "现场道具", "大巴票", "不知道", "不复述上一句"} {
		if !strings.Contains(provider.seen.GameContext, fact) {
			t.Fatalf("缺少对话约束或上下文 %q：%s", fact, provider.seen.GameContext)
		}
	}
}

func TestStoryRepeatedCloudReplyIsNotPlayedOrCommitted(t *testing.T) {
	provider := &fakeDialogueProvider{}
	service, before := storyConversationService(t, provider)
	intro, err := service.Command(before.ID, before.RunID, "intro", "听第一话")
	if err != nil {
		t.Fatal(err)
	}
	before = intro.State
	provider.text = before.Dialogue.Text
	var emitted bool
	_, err = service.CommandStream(context.Background(), before.ID, before.RunID, "repeat", "林岚，你懂宇宙飞船吗？", func(session.SpeechEvent) error {
		emitted = true
		return nil
	})
	if !errors.Is(err, session.ErrDialogueRepeated) || emitted {
		t.Fatalf("重复回答仍被播放：%v emitted=%t", err, emitted)
	}
	after, _ := service.Snapshot(before.ID)
	if !reflect.DeepEqual(after, before) {
		t.Fatal("重复的生成结果污染了存档")
	}
}

func TestStoryEmptyOrFailedCloudReplyKeepsPreviousStoryUntouched(t *testing.T) {
	for _, failure := range []error{nil, errors.New("cloud timeout")} {
		provider := &fakeDialogueProvider{err: failure}
		service, before := storyConversationService(t, provider)
		_, err := service.Command(before.ID, before.RunID, "failed", "林岚，你懂宇宙飞船吗？")
		if !errors.Is(err, session.ErrLinxUnavailable) {
			t.Fatalf("没有明确的失败反馈：%v", err)
		}
		after, _ := service.Snapshot(before.ID)
		if !reflect.DeepEqual(after, before) {
			t.Fatal("失败回答推进了故事")
		}
	}
}
