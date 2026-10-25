package jev

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"nightwatch/internal/game"
)

func TestJudgeMealSendsParticipantsAndParsesChoices(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/systemone" || r.Method != http.MethodPost {
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer test-key" {
			t.Fatalf("authorization = %q", got)
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if body["model"] != "jev-latest" || !strings.Contains(body["state"].(string), "玩家发言") {
			t.Fatalf("unexpected request body: %+v", body)
		}
		questions := body["questions"].(map[string]any)
		if len(questions) != 2 || questions["meal_linlan"] == nil {
			t.Fatalf("participants were not sent: %+v", questions)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"model":"jev-latest","answers":{"meal_linlan":{"type":"choice","choice":"refused","confidence":0.91},"meal_zhouyan":{"type":"choice","choice":"deferred","confidence":0.88}}}`))
	}))
	defer server.Close()
	client := New(Config{APIKey: "test-key", APIBase: server.URL, RequestLimit: time.Second})
	result, err := client.JudgeMeal(context.Background(), game.MealJudgeRequest{
		PlayerText: "林岚，别吃这碗肉粥。",
		Scene:      "斋堂",
		Participants: []game.MealParticipant{
			{ID: "linlan", Name: "林岚", Traits: []string{"谨慎"}},
			{ID: "zhouyan", Name: "周砚", Traits: []string{"求证"}},
		},
	})
	if err != nil || result.Decisions["linlan"].Choice != "refused" || result.Decisions["zhouyan"].Choice != "deferred" {
		t.Fatalf("JudgeMeal() = %+v, %v", result, err)
	}
}

func TestJudgeOracleParsesSincerityAndScore(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"model":"jev-latest","answers":{"sincerity":{"type":"choice","choice":"sincere","confidence":0.8},"sincerity_score":{"type":"score","score":82,"confidence":0.9}}}`))
	}))
	defer server.Close()
	client := New(Config{APIKey: "test-key", APIBase: server.URL})
	result, err := client.JudgeOracle(context.Background(), game.OracleJudgeRequest{PlayerText: "可能有风，也可能是我拿得不稳，我会先稳住手。", Devotion: 64})
	if err != nil || !result.Sincere || result.Score != 82 {
		t.Fatalf("JudgeOracle() = %+v, %v", result, err)
	}
}

func TestJudgeOracleMapsTypeSafeRubricScoreToPercentage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"answers":{"sincerity":{"type":"choice","choice":"sincere","confidence":0.8},"sincerity_score":{"type":"score","score":2,"confidence":0.9}}}`))
	}))
	defer server.Close()
	client := New(Config{APIKey: "key", APIBase: server.URL})
	result, err := client.JudgeOracle(context.Background(), game.OracleJudgeRequest{PlayerText: "认真回答"})
	if err != nil || result.Score != 100 {
		t.Fatalf("rubric score was not normalized: %+v, %v", result, err)
	}
}

func TestJudgeRoomActionSendsVisibleContextAndParsesChoice(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/systemone" || r.Method != http.MethodPost {
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		state := body["state"].(string)
		for _, want := range []string{"门房", "room_table", "红烛已点燃：true", "桌上那本书"} {
			if !strings.Contains(state, want) {
				t.Fatalf("room context missing %q: %s", want, state)
			}
		}
		questions := body["questions"].(map[string]any)
		if questions["room_action"] == nil {
			t.Fatalf("room action question missing: %+v", questions)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"answers":{"room_action":{"type":"choice","choice":"scripture","confidence":0.93}}}`))
	}))
	defer server.Close()
	client := New(Config{APIKey: "test-key", APIBase: server.URL, RequestLimit: time.Second})
	result, err := client.JudgeRoomAction(context.Background(), game.RoomActionRequest{
		PlayerText: "我想看看桌上那本书",
		Scene:      "门房",
		SceneText:  "矮桌上放着书册",
		Shot:       "room_table",
		CandleLit:  true,
	})
	if err != nil || result.Action != game.RoomActionScripture || result.Confidence != .93 {
		t.Fatalf("JudgeRoomAction() = %+v, %v", result, err)
	}
}

func TestJudgeRoomActionRejectsUnknownChoice(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"answers":{"room_action":{"type":"choice","choice":"unknown","confidence":0.94}}}`))
	}))
	defer server.Close()
	client := New(Config{APIKey: "test-key", APIBase: server.URL})
	if _, err := client.JudgeRoomAction(context.Background(), game.RoomActionRequest{PlayerText: "这是什么"}); err == nil {
		t.Fatal("unknown room choice was accepted")
	}
}

func TestJudgeOptionSendsConstrainedChoicesAndParsesID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		questions := body["questions"].(map[string]any)
		option := questions["option"].(map[string]any)
		if !strings.Contains(option["instructions"].(string), "只能选择") {
			t.Fatalf("option guard missing: %+v", option)
		}
		criteria := option["criteria"].(map[string]any)
		if criteria["listen"] == nil || criteria["none"] == nil {
			t.Fatalf("constrained choices missing: %+v", criteria)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"answers":{"option":{"type":"choice","choice":"listen","confidence":0.91}}}`))
	}))
	defer server.Close()
	client := New(Config{APIKey: "test-key", APIBase: server.URL})
	result, err := client.JudgeOption(context.Background(), game.OptionJudgeRequest{
		PlayerText: "我想先听一下",
		Scene:      "门房·四敲空门",
		Options: []game.StoryOption{
			{ID: "listen", Command: "听敲门", Description: "重听四敲"},
		},
	})
	if err != nil || result.Choice != "listen" || result.Confidence != .91 {
		t.Fatalf("JudgeOption() = %+v, %v", result, err)
	}
}

func TestJudgeRejectsMissingKeyAndInvalidResponse(t *testing.T) {
	client := New(Config{})
	if _, err := client.JudgeOracle(context.Background(), game.OracleJudgeRequest{PlayerText: "回答"}); err == nil {
		t.Fatal("missing API key was accepted")
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(`{}`)) }))
	defer server.Close()
	client = New(Config{APIKey: "key", APIBase: server.URL})
	if _, err := client.JudgeOracle(context.Background(), game.OracleJudgeRequest{PlayerText: "回答"}); err == nil {
		t.Fatal("empty answers were accepted")
	}
}
