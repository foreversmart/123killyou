package game

import "strings"

var miniOpeningShots = map[string]string{
	"mini_arrival": "arrival_gate", "mini_register": "register_desk", "mini_refectory": "refectory_table",
	"mini_corridor_candle": "corridor_candles", "mini_room": "room_table", "mini_wake_three_gongs": "wake_candle",
	"mini_four_knocks": "four_knocks", "mini_three_knocks": "three_knocks", "mini_listen": "listen_door",
	"mini_oracle": "oracle_table", "mini_double": "double_enter", "mini_dawn_trap": "dawn_gongs",
	"mini_dawn": "dawn_courtyard", "mini_ending": "ending_bus", "mini_death": "death_door",
}

var miniShotDescriptions = map[string]string{
	"register_rooms":     "东院四间偏房分列回廊两侧。林岚停在听房，周砚弯腰看灯房门轴，许栀用蓝色发圈夹住纸房的入住须知。",
	"register_luggage":   "四只旅行包靠在各自门边。残页与念珠已放上门房矮桌，红烛还要在晚膳后的回廊领取。",
	"refectory_porridge": "木勺拨开粥面，米粒间露出一缕细肉纤维，四只碗签在夕照里排成一线。",
	"refectory_curtain":  "长明灯把慧普的半张脸投在帘后。他没有动勺，温和的声音却压过了桌边的窃语。",
	"corridor_warning":   "陆沉把食指竖在唇前。四扇偏房门下，檐灯同时轻轻晃了一下。",
	"corridor_two_gongs": "两声更锣从封闭钟楼方向传来。陆沉站在门房前，示意众人各自关门。",
	"room_candle":        "火柴擦亮，红烛的火苗终于站稳。烛光落在门闩、残页与念珠上，床脚仍暗着。",
	"room_history":       "摊开的游客寺史册停在顾怀山的记载。‘验身’一栏只剩一排被撕断的纸齿。",
	"room_scripture":     "薄蓝经书摊在烛前。四句短偈沿着纸页末行写下，窗纸上的树影从字间慢慢移过。",
	"listen_skin":        "半掩的门里，慧普背对走廊。撑起的后背只有一层缝合的人皮，他的手正在床沿剥下一整片肩背皮。",
	"listen_vase":        "脚后跟碰到花瓶，瓷片碎在脚边。慧普的手停住，所有廊灯同时压暗，他正转向这扇门。",
	"oracle_cast":        "两片杯筊在灯下翻转，落向偏殿地砖。神公低头看着杯面，门外脚步仍在逼近。",
	"oracle_rescue":      "杯筊一平一凸。神公站起身，提起桌边的引路红烛，灯线沿着回廊通往门房。",
	"oracle_stone":       "两片杯面朝着同一边。神公的指尖先变灰，石色爬过衣领；他身后的佛像多了一张相同的脸。",
	"double_candle":      "同行人蹲在红烛另一侧，伸手遮住火焰。它的呼吸没有白雾，影子的边缘在地上断开。",
	"double_exit":        "同行人把手搭上门闩，反复说只看一眼。衣领下，一条细缝正随着说话拉开。",
	"double_frenzy":      "它猛地抓向自己的脸，冲出半开的门。门闩还在你手边，红烛仍然亮着。",
	"double_calm":        "四句偈落下，红烛逐次站稳。同行人伏到床脚，抓挠声终于停了。",
	"dawn_knocks":        "窗纸仍黑。三下敲门从门外传来，熟悉的人声说天亮了，门缝却没有一丝晨光。",
	"dawn_wait":          "你守着红烛等候。门外的呼吸逐渐远去，下一组更锣到来前，窗纸先显出淡青色。",
	"dawn_gate":          "晨光照进山门。林岚带着相机，周砚收起修缮图，许栀抱着旅行包，陆沉伸手接回通行凭。",
}

func miniShot(state *State, key string) {
	state.ShotKey = key
	if key == "dawn_gate" {
		state.SceneName = "山门·晨光送客"
		state.RoomName = "灯影寺山门"
	}
	if key == "dawn_courtyard" {
		state.SceneName = "东院·五更天亮"
		state.RoomName = "东院回廊"
	}
	if text, ok := miniShotDescriptions[key]; ok {
		state.SceneText = text
	}
}

func miniCompanionID(state *State) string {
	for _, id := range []string{"linlan", "zhouyan", "xuzhi"} {
		if !state.Flags["meal_"+id+"_ate"] {
			return id
		}
	}
	return ""
}

func miniDoubleID(state *State) string {
	companion := miniCompanionID(state)
	for _, id := range []string{"linlan", "zhouyan", "xuzhi"} {
		if id != companion && state.Flags["meal_"+id+"_ate"] {
			return id
		}
	}
	for _, id := range []string{"xuzhi", "zhouyan", "linlan"} {
		if id != companion {
			return id
		}
	}
	return "linlan"
}
func miniDoubleName(state *State) string { return miniPersonName(miniDoubleID(state)) }

func syncMiniStaging(state *State) {
	if state.SceneKey == "mini_listen" {
		if state.Flags["vase_broken"] {
			state.SceneProps = []string{"碎花瓶", "半掩房门", "猫食碟", "鸟笼", "红烛"}
		}
		if state.Flags["skin_seen"] {
			present := false
			for _, person := range state.Actors {
				if person.ID == "victim" {
					present = true
				}
			}
			if !present {
				id := "zhouyan"
				if miniCompanionID(state) == id {
					id = "xuzhi"
				}
				state.Actors = append(state.Actors, actor("victim", miniPersonName(id), "房内游客", "半掩房门后的床上", id, "肩背贴着床沿，一动不动"))
			}
		}
	}

	for index := range state.Actors {
		actor := &state.Actors[index]
		if state.SceneKey == "mini_dawn" {
			positions := map[string]string{
				"player": "门房门前 / 东院回廊", "linlan": "听房门口", "zhouyan": "灯房门口",
				"xuzhi": "纸房门口", "luchen": "东院回廊中央",
			}
			if state.ShotKey == "dawn_gate" {
				positions = map[string]string{
					"player": "山门台阶 / 同行者身侧", "linlan": "山门左侧石阶", "zhouyan": "旧匾下方石阶",
					"xuzhi": "山门中央 / 四只行李旁", "luchen": "山门内侧 / 接回通行凭",
				}
			}
			actor.Position = positions[actor.ID]
		}
		switch actor.ID {
		case "unknown", "companion_voice":
			actor.Visible = false
			actor.Role = "门外声源，身份未确认"
			if state.SceneKey == "mini_three_knocks" && miniCompanionID(state) != "" {
				actor.Name, actor.Portrait = miniCompanionName(state)+"（门外）", miniCompanionID(state)
			} else {
				actor.Name = "门外声源"
			}
		case "luchen":
			if state.SceneKey == "mini_room" {
				actor.Visible = false
			}
		case "companion":
			actor.ID, actor.Name, actor.Portrait = miniCompanionID(state), miniCompanionName(state), miniCompanionID(state)
			actor.Visible = state.Flags["companion_present"] && actor.ID != ""
		case "huipu":
			actor.Visible = state.SceneKey == "mini_refectory" || (state.SceneKey == "mini_listen" && state.Flags["skin_seen"])
			if state.SceneKey == "mini_listen" {
				actor.Status = "背皮空洞，停手侧听"
			}
		case "skin_double":
			actor.Name, actor.Portrait, actor.Role = miniDoubleName(state), miniDoubleID(state), "同行者"
			actor.Status = "蹲在烛光边缘"
			if state.Flags["double_refused_candle"] {
				actor.Status = "盯住门闩，衣领露出缝线"
			}
			if state.Flags["double_frenzy"] {
				actor.Position, actor.Visible = "门外", false
			}
			if state.Flags["double_calm"] {
				actor.Position, actor.Status = "床脚", "伏地安静"
			}
		case "shangong":
			if state.Flags["cup_failed"] {
				actor.Status = "从指尖开始石化"
			}
			if state.Flags["cup_jiao_rescue"] {
				actor.Status = "提起引路红烛"
			}
		}
	}
}

func miniVoicePortrait(speaker string) string {
	for name, id := range map[string]string{"陆沉": "keeper", "林岚": "linlan", "周砚": "zhouyan", "许栀": "xuzhi", "慧普": "huipu", "神公": "shangong", "你": "player"} {
		if speaker == name || strings.HasPrefix(speaker, name+"（") || strings.HasPrefix(speaker, name+"·") {
			return id
		}
	}
	return ""
}
