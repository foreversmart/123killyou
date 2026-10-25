package game

import (
	"reflect"
	"strings"
	"testing"
)

func storyCommands(engine *Engine, state *State, commands ...string) {
	for _, command := range commands {
		engine.Apply(state, command)
	}
}
func drainMiniDialogue(t *testing.T, engine *Engine, state *State) []string {
	t.Helper()
	var speakers []string
	for count := 0; state.DialogueNext != "" && !strings.HasPrefix(state.DialogueNext, "自动"); count++ {
		if count > 20 {
			t.Fatal("对白没有在玩家选择前结束")
		}
		engine.Apply(state, state.DialogueNext)
		if state.Dialogue.Speaker == "系统" {
			t.Fatalf("剧情台词被系统代说: %+v", state.Dialogue)
		}
		speakers = append(speakers, state.Dialogue.Speaker)
	}
	return speakers
}
func storyAtListen(t *testing.T, meat bool) (*Engine, State) {
	t.Helper()
	e := newStoryTestEngine(t)
	s := e.Initial("storyboard")
	storyCommands(e, &s, "登记入住", "去斋堂")
	if meat {
		e.Apply(&s, "我吃肉粥")
	} else {
		e.Apply(&s, "劝大家不要吃粥")
	}
	storyCommands(e, &s, "吃完晚膳", "拿红烛", "回房", "点燃红烛", "阅读大念处经", "睡下", "续燃红烛", "不开门", "跟同伴去偷听")
	return e, s
}

func TestStoryboardConversationsKeepTheirActorsAndStopAtChoices(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("staged")
	if got := drainMiniDialogue(t, e, &s); !reflect.DeepEqual(got, []string{"林岚", "许栀", "林岚", "周砚", "许栀", "陆沉", "赵熙·心声"}) {
		t.Fatalf("山门说话者: %v", got)
	}
	e.Apply(&s, "登记入住")
	if got := drainMiniDialogue(t, e, &s); !reflect.DeepEqual(got, []string{"周砚", "陆沉", "林岚", "许栀", "陆沉"}) {
		t.Fatalf("入住说话者: %v", got)
	}
	if s.ShotKey != "register_key_tags" {
		t.Fatal("没有演出钥匙和房牌交接")
	}
	e.Apply(&s, "去斋堂")
	if got := drainMiniDialogue(t, e, &s); !reflect.DeepEqual(got, []string{"周砚", "陆沉", "林岚", "许栀"}) {
		t.Fatalf("晚膳说话者: %v", got)
	}
	if s.Flags["meal_player_ate"] || s.Flags["meal_player_refused"] {
		t.Fatal("演出对白替玩家做了吃粥选择")
	}
	storyCommands(e, &s, "劝大家不吃", "吃完晚膳")
	if got := drainMiniDialogue(t, e, &s); !reflect.DeepEqual(got, []string{"陆沉", "陆沉", "林岚", "陆沉", "陆沉", "陆沉"}) {
		t.Fatalf("回廊说话者: %v", got)
	}
	if s.ShotKey != "corridor_two_gongs" || s.Flags["red_candle_held"] {
		t.Fatal("更锣与领烛时序错误")
	}
	if s.Dialogue.Text != "各位施主，二更天到了，请各位早些休息吧。五更天我们会起来做早课，有空的话，可以前来观摩。" {
		t.Fatalf("二更对白未落在房门前: %q", s.Dialogue.Text)
	}
}

func TestCorridorScriptUsesTheUpdatedRedCandleAndTimeWarnings(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("corridor-script")
	e.setMiniScene(&s, "mini_corridor_candle")
	want := []string{
		"晚上回到房里，必须把红烛点起来。红烛能驱除邪祟，别让火在房里熄了。",
		"夜里非必要不要出门，免得被不干净的东西缠上。",
		"寺庙里面……还有不干净的地方吗？",
		"嘘，小声些，不可妄语。要是心里担心、害怕，就多读几页经书，经书能让人定定心神。",
		"寺里的规矩，夜里会打更，每个时辰打对应锣声数，比如说两根就打两次锣声，千万别把回声和风声混在一起听错了。",
		"各位施主，二更天到了，请各位早些休息吧。五更天我们会起来做早课，有空的话，可以前来观摩。",
	}
	for index, expected := range want {
		intent, speak := e.Apply(&s, "继续听")
		if intent != "story" || speak != expected || s.Dialogue.Text != expected {
			t.Fatalf("第%d句回廊台词不匹配: intent=%s speak=%q dialogue=%q", index+1, intent, speak, s.Dialogue.Text)
		}
	}
	if s.DialogueNext != "" || s.ShotKey != "corridor_two_gongs" {
		t.Fatalf("回廊对白结束后状态错误: next=%q shot=%q", s.DialogueNext, s.ShotKey)
	}
}

func TestStoryboardDoorSourcesAreNotVisibleOrProvenByNarration(t *testing.T) {
	e, s := storyAtListen(t, false)
	for _, scene := range []string{"mini_room", "mini_four_knocks", "mini_three_knocks", "mini_dawn_trap"} {
		e.setMiniScene(&s, scene)
		syncMiniStaging(&s)
		for _, actor := range s.Actors {
			if actor.ID != "player" && actor.Visible {
				t.Fatalf("%s提前显示了门外人物: %+v", scene, actor)
			}
		}
	}
}

func TestThreeKnocksCompanionsCallZhaoXiWithTheirOwnWarning(t *testing.T) {
	for _, tt := range []struct {
		id, want string
	}{
		{"linlan", "喂，赵熙还在吗？我刚从窗缝看见住持进了周砚的房，那边好像有人在挪东西。"},
		{"zhouyan", "喂，赵熙，你还在吗？我刚看见慧普进了许栀的房，她的门响了一下，你听见了吗？"},
		{"xuzhi", "喂，赵熙，你还醒着吗？我有点害怕。我刚听见了外面有拖动的声音，像是重物拖过地板，你听见了吗？要不要跟我来看一下？"},
	} {
		t.Run(tt.id, func(t *testing.T) {
			e := newStoryTestEngine(t)
			s := e.Initial("three-knocks-dialogue")
			for _, id := range []string{"linlan", "zhouyan", "xuzhi"} {
				if id != tt.id {
					s.Flags["meal_"+id+"_ate"] = true
				}
			}
			e.setMiniScene(&s, "mini_three_knocks")
			intent, speak := e.Apply(&s, "继续听")
			if intent != "story" || speak != tt.want || s.Dialogue.Text != tt.want {
				t.Fatalf("三敲同行台词不匹配: intent=%s speak=%q dialogue=%+v", intent, speak, s.Dialogue)
			}
		})
	}
}

func TestStoryboardCompanionsFollowTheirIndividualMeals(t *testing.T) {
	for _, want := range []string{"linlan", "zhouyan", "xuzhi"} {
		t.Run(want, func(t *testing.T) {
			e := newStoryTestEngine(t)
			s := e.Initial("meals")
			storyCommands(e, &s, "登记入住", "去斋堂", "查看施食记")
			for _, id := range []string{"linlan", "zhouyan", "xuzhi"} {
				choice := "吃粥"
				if id == want {
					choice = "不吃粥"
				}
				e.Apply(&s, "让"+miniPersonName(id)+choice)
			}
			storyCommands(e, &s, "我不吃粥", "吃完晚膳", "拿红烛", "回房", "点燃红烛", "睡下", "续燃红烛", "不开门", "跟同伴去偷听")
			if miniCompanionID(&s) != want {
				t.Fatalf("同伴错配: %v", s.Flags)
			}
			found := false
			for _, actor := range s.Actors {
				if actor.ID == want && actor.Visible {
					found = true
				}
			}
			if !found {
				t.Fatalf("真同伴没有在主角身后出现: %+v", s.Actors)
			}
		})
	}
}

func TestStoryboardSkinAndVaseAreTwoDistinctShots(t *testing.T) {
	e, s := storyAtListen(t, false)
	if s.ShotKey != "listen_door" {
		t.Fatal(s.ShotKey)
	}
	e.Apply(&s, "继续听")
	if s.ShotKey != "listen_skin" || !s.Flags["skin_seen"] || s.Flags["vase_broken"] {
		t.Fatalf("剥皮镜头未单独停留: %+v", s)
	}
	e.Apply(&s, "继续听")
	if s.ShotKey != "listen_vase" || !s.Flags["vase_broken"] || s.DialogueNext != "" {
		t.Fatal("碰瓶后没有留出动物声选择窗口")
	}
}

func TestStoryboardFourScriptureLinesCannotBeSkippedAndReplayIsHarmless(t *testing.T) {
	e, s := storyAtListen(t, true)
	e.Apply(&s, "模仿猫叫")
	if s.SceneKey != "mini_double" {
		t.Fatal("没有假同伴")
	}
	e.Apply(&s, "继续听")
	if s.Dialogue.Speaker != miniDoubleName(&s) || s.DialogueNext != "" {
		t.Fatal("假同伴没有用模仿者身份提灭烛要求")
	}
	e.Apply(&s, "朗读大念处经")
	if s.Flags["double_calm"] {
		t.Fatal("一句输入跳过了四句经文")
	}
	before := Clone(s)
	e.Apply(&s, "重听这句")
	if !reflect.DeepEqual(before, s) {
		t.Fatal("重听改变了剧情状态")
	}
	for index := 1; index < 4; index++ {
		e.Apply(&s, "继续念经")
		if s.Dialogue.Text != miniScripture[index] {
			t.Fatalf("第%d句错误", index+1)
		}
	}
	if !s.Flags["double_calm"] || s.ShotKey != "double_scripture_4" {
		t.Fatal("四句经文后没有安静")
	}
	e.Apply(&s, "继续听")
	if s.ShotKey != "double_calm" {
		t.Fatal("缺少安静伏地镜头")
	}
	e.Apply(&s, "继续听")
	if s.SceneKey != "mini_dawn_trap" {
		t.Fatal("安抚后没有入睡")
	}
}

func TestStoryboardOracleWeightedCastAndSafeRetry(t *testing.T) {
	for _, tt := range []struct {
		ate     bool
		roll    int
		success bool
	}{{false, 50, true}, {true, 60, false}, {true, 20, true}} {
		e, s := storyAtListen(t, tt.ate)
		e.storyRoll = func() int { return tt.roll }
		storyCommands(e, &s, "跑向大殿", "救我", "可能是风，也可能是我拿得不稳，我会先稳住手")
		if s.Flags["cup_cast_counted"] {
			t.Fatal("求救代替玩家掷杯筊")
		}
		storyCommands(e, &s, "掷杯筊", "继续听")
		if s.Flags["cup_jiao_rescue"] != tt.success {
			t.Fatalf("吃粥权重未生效: %v", s.Flags)
		}
		if tt.success {
			if s.ShotKey != "oracle_rescue" || s.Dialogue.Speaker != "神公" {
				t.Fatal("神公没有亲自说命不该绝")
			}
		} else {
			if s.ShotKey != "oracle_stone" {
				t.Fatal("没有先展示石化")
			}
			storyCommands(e, &s, "继续听", "从最近安全节点重试")
			if s.SceneKey != "mini_listen" || s.Flags["story_dead"] || s.Flags["cup_cast_counted"] || !s.Flags["meal_player_ate"] {
				t.Fatalf("安全重试丢失路线或保留坏结算: %+v", s)
			}
		}
	}
}

func TestStoryboardDawnRequiresWaitingAndKeepsFalseVoiceOutside(t *testing.T) {
	e, s := storyAtListen(t, false)
	storyCommands(e, &s, "模仿鸟叫", "把锣声算作第六声")
	if !strings.HasSuffix(s.Dialogue.Speaker, "（门外）") || s.ShotKey != "dawn_knocks" {
		t.Fatal("假晓未定位声源")
	}
	storyCommands(e, &s, "不开门等待真正的五更")
	if s.SceneKey != "mini_dawn_trap" || s.ShotKey != "dawn_wait" {
		t.Fatal("等待选择没有保留黑夜镜头")
	}
	e.Apply(&s, "继续听")
	if s.SceneKey != "mini_dawn" {
		t.Fatal("真正五更没有天亮")
	}
	for _, actor := range s.Actors {
		if actor.ID == "linlan" && actor.Position != "听房门口" {
			t.Fatalf("东院重逢仍使用山门站位: %+v", actor)
		}
	}
	drainMiniDialogue(t, e, &s)
	if s.ShotKey != "dawn_gate" || s.RoomName != "红烛寺山门" {
		t.Fatal("没有随送客镜头走到山门")
	}
	for _, actor := range s.Actors {
		if actor.ID == "linlan" && actor.Position != "山门左侧石阶" {
			t.Fatalf("山门送客仍使用偏房站位: %+v", actor)
		}
	}
	storyCommands(e, &s, "把残页留下", "坐大巴回家")
	if s.ShotKey != "ending_bus" || !s.Flags["page_left"] || !s.Flags["story_finished"] {
		t.Fatal("没有完成离寺后视镜分镜")
	}
}
