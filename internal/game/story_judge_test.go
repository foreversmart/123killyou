package game

import (
	"context"
	"strings"
	"testing"

	"nightwatch/internal/content"
)

type fakeStoryJudge struct {
	mealCalls   int
	oracleCalls int
	meal        MealJudgeResult
	oracle      OracleJudgeResult
}

func (f *fakeStoryJudge) JudgeMeal(context.Context, MealJudgeRequest) (MealJudgeResult, error) {
	f.mealCalls++
	return f.meal, nil
}

func (f *fakeStoryJudge) JudgeOracle(context.Context, OracleJudgeRequest) (OracleJudgeResult, error) {
	f.oracleCalls++
	return f.oracle, nil
}

func TestStoryJudgeSettlesCompanionPersuasionAndNaturalReply(t *testing.T) {
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	e := NewEngine(catalog)
	judge := &fakeStoryJudge{meal: MealJudgeResult{Decisions: map[string]MealDecision{
		"linlan": {Choice: "refused", Reply: "好，我听你的。", Confidence: .92},
	}}}
	e.SetStoryJudge(judge)
	s := e.Initial("judge-meal")
	e.setMiniScene(&s, "mini_refectory")
	_, reply := e.Apply(&s, "劝林岚别吃肉粥")
	if judge.mealCalls != 1 || !s.Flags["meal_linlan_refused"] || strings.Contains(reply, "同行者") || !strings.Contains(reply, "我也不吃肉粥了") {
		t.Fatalf("jev meal decision was not applied: calls=%d flags=%v reply=%s", judge.mealCalls, s.Flags, reply)
	}
}

func TestStoryJudgeUsesSincerityBeforeCupCast(t *testing.T) {
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	e := NewEngine(catalog)
	judge := &fakeStoryJudge{oracle: OracleJudgeResult{Sincere: true, Score: 88, Confidence: .9}}
	e.SetStoryJudge(judge)
	s := e.Initial("judge-oracle")
	e.setMiniScene(&s, "mini_oracle")
	e.Apply(&s, "确认求回门房")
	if !strings.Contains(s.Dialogue.Text, "红烛的火苗晃动是有风嘛") {
		t.Fatalf("神公没有先问火苗问题: %s", s.Dialogue.Text)
	}
	e.Apply(&s, "可能是风，也可能是我拿得不稳，我会先稳住手")
	if judge.oracleCalls != 1 || !s.Flags["oracle_sincere"] || !s.Flags["oracle_sincerity_judged"] || s.Flags["oracle_sincerity_question"] || s.OracleSincerityScore != 88 {
		t.Fatalf("jev sincerity decision was not applied: calls=%d flags=%v", judge.oracleCalls, s.Flags)
	}
}
