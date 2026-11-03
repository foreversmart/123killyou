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

func TestJudgeMealSendsSeparateDifficultyQuestionsAndContext(t *testing.T) {
	var received request
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/systemone" || r.Method != http.MethodPost || r.Header.Get("Authorization") != "Bearer test-key" {
			t.Errorf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		if err := json.NewDecoder(r.Body).Decode(&received); err != nil {
			t.Errorf("decode request: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"answers":{"meal_linlan":{"choice":"refused","confidence":0.91},"meal_zhouyan":{"choice":"refused","confidence":0.92},"meal_zhouyan_sincerity":{"choice":"sincere","confidence":0.88},"meal_xuzhi":{"choice":"refused","confidence":0.94},"meal_xuzhi_reasons":{"choice":"three_or_more","confidence":0.85}}}`))
	}))
	defer server.Close()
	client := New(Config{APIKey: "test-key", APIBase: server.URL, RequestLimit: time.Second})
	input := game.MealJudgeRequest{
		PlayerText: "大家别喝肉粥，寺里讲究清净，肉的来历还没查清，馒头素菜也能填饱肚子。",
		Scene:      "斋堂", Dialogue: "再说清楚你的顾虑。", History: "主角此前劝过一次。",
		Participants: []game.MealParticipant{
			{ID: "linlan", Name: "林岚", Traits: []string{"信任主角"}, PersuasionAttempts: 1},
			{ID: "zhouyan", Name: "周砚", Traits: []string{"理性求证"}, Voice: "冷静", LastReply: "第一次还不够。", MealChoice: "deferred", PersuasionAttempts: 2},
			{ID: "xuzhi", Name: "许栀", Traits: []string{"有主见"}, PersuasionAttempts: 1},
		},
	}
	result, err := client.JudgeMeal(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	if received.Model != "jev-latest" || len(received.Questions) != 5 {
		t.Fatalf("wrong model or missing individual evaluations: %+v", received)
	}
	for _, want := range []string{input.PlayerText, input.Scene, input.Dialogue, input.History} {
		if !strings.Contains(received.State, want) {
			t.Errorf("request state omitted %q", want)
		}
	}
	for key, required := range map[string][]string{
		"meal_linlan":            {"一次明确"},
		"meal_zhouyan":           {"至少需要两次", "40个有效文字", "含本次劝说次数：2", "理性求证", "冷静", "第一次还不够。", "当前选择：deferred"},
		"meal_zhouyan_sincerity": {"本次玩家原话", "机械重复", "尊重对方自主选择"},
		"meal_xuzhi":             {"至少三个不同"},
		"meal_xuzhi_reasons":     {"只计算本次", "不得累计此前回合", "机械编号", "重复改写"},
	} {
		q, ok := received.Questions[key]
		if !ok || q.Type != "choice" {
			t.Fatalf("missing constrained question %q: %+v", key, received.Questions)
		}
		for _, want := range required {
			if !strings.Contains(q.Instructions, want) {
				t.Errorf("%s omitted %q: %s", key, want, q.Instructions)
			}
		}
	}
	if got := result.Decisions["linlan"]; got.Choice != "refused" || got.Confidence != .91 {
		t.Errorf("linlan: %+v", got)
	}
	if got := result.Decisions["zhouyan"]; got.Choice != "refused" || !got.Sincere || got.Confidence != .88 {
		t.Errorf("zhouyan: %+v", got)
	}
	if got := result.Decisions["xuzhi"]; got.Choice != "refused" || got.ReasonCount != 3 || got.Confidence != .85 {
		t.Errorf("xuzhi: %+v", got)
	}
}

func TestJudgeMealRequiresBothDecisionAndEvidenceConfidence(t *testing.T) {
	for _, tc := range []struct {
		name, person, evidenceKey string
		decision, evidence        answer
		omitEvidence              bool
		wantConfidence            float64
		wantSincere               bool
		wantReasons               int
	}{
		{"missing sincerity", "zhouyan", "meal_zhouyan_sincerity", answer{Choice: "refused", Confidence: .9}, answer{}, true, 0, false, 0},
		{"low sincerity confidence", "zhouyan", "meal_zhouyan_sincerity", answer{Choice: "refused", Confidence: .9}, answer{Choice: "sincere", Confidence: .4}, false, .4, true, 0},
		{"low decision confidence", "zhouyan", "meal_zhouyan_sincerity", answer{Choice: "refused", Confidence: .3}, answer{Choice: "sincere", Confidence: .9}, false, .3, true, 0},
		{"insincere", "zhouyan", "meal_zhouyan_sincerity", answer{Choice: "refused", Confidence: .9}, answer{Choice: "insincere", Confidence: .85}, false, .85, false, 0},
		{"missing reasons", "xuzhi", "meal_xuzhi_reasons", answer{Choice: "refused", Confidence: .9}, answer{}, true, 0, false, 0},
		{"two reasons", "xuzhi", "meal_xuzhi_reasons", answer{Choice: "refused", Confidence: .9}, answer{Choice: "two", Confidence: .8}, false, .8, false, 2},
		{"three reasons", "xuzhi", "meal_xuzhi_reasons", answer{Choice: "refused", Confidence: .9}, answer{Choice: "three_or_more", Confidence: .8}, false, .8, false, 3},
		{"low reasons confidence", "xuzhi", "meal_xuzhi_reasons", answer{Choice: "refused", Confidence: .9}, answer{Choice: "three_or_more", Confidence: .4}, false, .4, false, 3},
		{"unknown reasons", "xuzhi", "meal_xuzhi_reasons", answer{Choice: "refused", Confidence: .9}, answer{Choice: "many", Confidence: .8}, false, .8, false, 0},
		{"missing confidence", "xuzhi", "meal_xuzhi_reasons", answer{Choice: "refused"}, answer{Choice: "three_or_more", Confidence: .9}, false, 0, false, 3},
	} {
		t.Run(tc.name, func(t *testing.T) {
			answers := map[string]answer{"meal_" + tc.person: tc.decision}
			if !tc.omitEvidence {
				answers[tc.evidenceKey] = tc.evidence
			}
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				_ = json.NewEncoder(w).Encode(response{Answers: answers})
			}))
			defer server.Close()
			client := New(Config{APIKey: "key", APIBase: server.URL})
			result, err := client.JudgeMeal(context.Background(), game.MealJudgeRequest{
				PlayerText: "劝说", Participants: []game.MealParticipant{{ID: tc.person}},
			})
			if err != nil {
				t.Fatal(err)
			}
			got := result.Decisions[tc.person]
			if got.Confidence != tc.wantConfidence || got.Sincere != tc.wantSincere || got.ReasonCount != tc.wantReasons {
				t.Fatalf("unreliable evidence was promoted: %+v", got)
			}
		})
	}
}

func TestJudgeMealRejectsEvidenceWithoutParticipantDecision(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"answers":{"meal_xuzhi_reasons":{"choice":"three_or_more","confidence":0.99}}}`))
	}))
	defer server.Close()
	client := New(Config{APIKey: "key", APIBase: server.URL})
	_, err := client.JudgeMeal(context.Background(), game.MealJudgeRequest{Participants: []game.MealParticipant{{ID: "xuzhi"}}})
	if err == nil {
		t.Fatal("a reason count alone must not become a meal decision")
	}
}
