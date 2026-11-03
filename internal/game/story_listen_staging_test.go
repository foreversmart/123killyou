package game

import (
	"strings"
	"testing"
)

func TestListenKeepsCompanionOutsideAndDifferentFromBedVictim(t *testing.T) {
	for _, companion := range []string{"linlan", "zhouyan", "xuzhi", "", "all_refused"} {
		t.Run(companion, func(t *testing.T) {
			e := newStoryTestEngine(t)
			s := e.Initial("listen-staging")
			for _, id := range []string{"linlan", "zhouyan", "xuzhi"} {
				s.Flags["meal_"+id+"_ate"] = companion != "all_refused" && id != companion
			}
			e.setMiniScene(&s, "mini_three_knocks")
			e.Apply(&s, "跟同伴去偷听")
			if s.SceneKey != "mini_listen" || s.ShotKey != "listen_door" {
				t.Fatalf("未抵达门外首镜头: %s / %s", s.SceneKey, s.ShotKey)
			}
			for _, actor := range s.Actors {
				if actor.Visible && (actor.ID == "huipu" || actor.ID == "victim") {
					t.Fatalf("尚未透过门缝观察就显示房内人物: %+v", actor)
				}
			}
			e.Apply(&s, "观察屋内")
			if s.ShotKey != "listen_skin" || !strings.Contains(s.SceneText, "门缝") {
				t.Fatalf("观察没有保持门外视点: %s / %s", s.ShotKey, s.SceneText)
			}
			victim, monk, outside := 0, 0, 0
			for _, actor := range s.Actors {
				if !actor.Visible {
					continue
				}
				switch actor.ID {
				case "victim":
					victim++
					if actor.Portrait == miniCompanionID(&s) || !strings.Contains(actor.Status, "平躺") {
						t.Fatalf("床上人错用同行者或未躺下: %+v", actor)
					}
				case "huipu":
					monk++
					if !strings.Contains(actor.Position, "床侧地面") || !strings.Contains(actor.Status, "动手") {
						t.Fatalf("慧普没有站在床边动手: %+v", actor)
					}
				default:
					if !strings.Contains(actor.Position, "门外") {
						t.Fatalf("玩家或同行者进入房内: %+v", actor)
					}
					if actor.ID != "player" {
						outside++
					}
				}
			}
			wantOutside := 0
			if s.Flags["companion_present"] {
				wantOutside = 1
			}
			if victim != 1 || monk != 1 || outside != wantOutside {
				t.Fatalf("房内外人数错误: victim=%d monk=%d outside=%d", victim, monk, outside)
			}
			e.Apply(&s, "退后")
			for _, actor := range s.Actors {
				if actor.ID == "huipu" && (!strings.Contains(actor.Status, "停手") || !strings.Contains(actor.Status, "回头")) {
					t.Fatalf("花瓶碎后未停手回头: %+v", actor)
				}
			}
		})
	}
}
