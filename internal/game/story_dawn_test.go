package game

import (
	"reflect"
	"strings"
	"testing"
)

func TestDawnDialogueStopsAtTheGateAfterThreeCompanions(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("dawn-handoff")
	e.completeMiniRegistration(&s)
	e.setMiniScene(&s, "mini_dawn")
	if got := drainMiniDialogue(t, e, &s); !reflect.DeepEqual(got, []string{"林岚", "周砚", "许栀"}) {
		t.Fatalf("天亮对白说话者错误: %v", got)
	}
	if s.ShotKey != "dawn_gate" || s.DialogueNext != "" || !s.Flags["dawn_intro_done"] || !s.Flags["permit_returned"] {
		t.Fatalf("三句对白结束后未在归还通行凭的山门镜头等待玩家: %+v", s)
	}
	e.Apply(&s, "坐大巴回家")
	if s.SceneKey != "mini_ending" || !s.Flags["story_finished"] {
		t.Fatal("天亮对白结束后不能上车离寺")
	}
}

func TestDawnReturnRemovesPermitAcrossDeparturePaths(t *testing.T) {
	for _, commands := range [][]string{
		{"交还通行凭"},
		{"归还通信凭证"},
		{"听天亮对白", "继续听", "继续听"},
		{"整理行李"},
		{"坐大巴回家"},
	} {
		t.Run(strings.Join(commands, "/"), func(t *testing.T) {
			e := newStoryTestEngine(t)
			s := e.Initial("return-permit")
			e.completeMiniRegistration(&s)
			e.setMiniScene(&s, "mini_dawn")
			s.Overlay, s.FocusItem = "item", "permit"
			storyCommands(e, &s, commands...)
			if !s.Flags["permit_returned"] {
				t.Fatal("山门收回凭证没有结算")
			}
			for _, item := range s.Inventory {
				if item.ID == "permit" {
					t.Fatal("归还后通行凭仍留在随身物品")
				}
			}
			if s.FocusItem == "permit" || s.Overlay == "item" {
				t.Fatal("归还后仍在查看已交还的通行凭")
			}
			if s.SceneKey == "mini_dawn" {
				e.Apply(&s, "看看通行凭")
				if !strings.Contains(s.Dialogue.Text, "已经交还") || s.FocusItem == "permit" {
					t.Fatal("归还后仍可以查看通行凭")
				}
			}
		})
	}
}

func TestStoryRegistrationAndDebugDoNotGrantRemovedPage(t *testing.T) {
	e := newStoryTestEngine(t)
	if _, exists := e.content.Item("page"); exists {
		t.Fatal("物品配置仍包含残页")
	}
	s := e.Initial("without-page")
	e.completeMiniRegistration(&s)
	e.prepareMiniDebugScene(&s, 12)
	for _, item := range s.Inventory {
		if item.ID == "page" {
			t.Fatal("登记或调试跳转仍发放残页")
		}
	}
	e.setMiniScene(&s, "mini_dawn")
	for _, option := range StoryOptionChoices(s) {
		if strings.Contains(option.Command, "残页") {
			t.Fatal("天亮后仍提供残页选项")
		}
	}
}

func TestDawnTrapKeepsFourGongsSeparateFromTheBell(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("dawn-bell")
	e.setMiniScene(&s, "mini_dawn_trap")
	e.Apply(&s, "重听锣声和钟声")
	if !strings.Contains(s.SceneText, "四声更锣") || !strings.Contains(s.SceneText, "一声低沉悠长的钟") {
		t.Fatalf("假报晓声音未分开: %q", s.SceneText)
	}
	storyCommands(e, &s, "把钟声算作第五声")
	if s.ShotKey != "dawn_knocks" || s.Flags["story_dead"] || s.Dialogue.Text != "" ||
		!s.Flags["dawn_knocks_dialogue_pending"] || s.DialogueNext != dawnKnocksDialogueAdvance {
		t.Fatalf("误把钟声算为第五锣后没有先完整播放假同伴三敲: %+v", s)
	}
	storyCommands(e, &s, dawnKnocksDialogueAdvance)
	if s.Dialogue.Speaker != miniDoubleName(&s)+"（门外）" {
		t.Fatalf("三敲结束后没有播放门外对白: %+v", s.Dialogue)
	}
	storyCommands(e, &s, "不开门等待真正的五更", "继续听")
	if s.SceneKey != "mini_dawn" || !strings.Contains(s.SceneText, "真正的五声更锣") {
		t.Fatal("等待后没有保留真正五更的五声更锣")
	}
}
