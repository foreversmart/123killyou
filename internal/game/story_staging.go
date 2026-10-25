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
	"arrival_unload":       "车门气阀声慢下来。林岚先迈下台阶，揉了揉久坐发麻的小腿，四只小旅行包已经放在檐下靠墙处。",
	"arrival_gate_beauty":  "许栀下车后抬头看山门。新匾、檐角和树影落在她眼里，檐下的行李只到小腿高。",
	"arrival_weather":      "天气晴朗，山风从车门灌进来。林岚举起相机，对准月色将要升起的山门，却先没有按快门。",
	"arrival_zhouyan":      "周砚走到新匾侧面，手指沿旧字和梁架比了比，像是在比对榫口。",
	"arrival_luggage":      "四只小旅行包靠在山门檐下的墙边，蓝色发圈夹住入住须知，车门内已经空了。",
	"arrival_luchen":       "车门气阀声彻底停下，陆沉从山门内侧迎上来，抬手示意队伍沿东院长廊前进。",
	"arrival_inner":        "最后一缕树影在车门边晃动，鸟鸣和远处低钟隔着山风叠在一起；檐下行李安静靠墙。",
	"arrival_cat":          "晒太阳的花猫收起前爪，铜铃没有响，旧匾‘明照寺’从新匾侧面露出来。",
	"arrival_plaque":       "镜头贴近山门新匾，雨水磨花的旧字藏在金漆边缘，树影正好从中间切过。",
	"register_desk":        "登记室的桌前只放一本小型登记簿。陆沉研墨提笔，笔尖在纸页上逐一写下四个人的名字。",
	"register_key_tags":    "墨迹吹干后，四块旧铜牌在登记桌上依次排开，‘听、灯、纸、门’的字被指腹磨得发亮。",
	"register_drag_mark":   "周砚蹲下沿旧拖痕照过地砖，痕迹从偏殿方向延到回廊；陆沉先让他别碰，再答应晚膳后带队认路。",
	"register_camera_bell": "林岚把相机盖放到听房门边的铜铃旁，铃舌余音在回廊里慢慢散开。",
	"register_ribbon":      "许栀的蓝色发圈夹住入住须知的一角，她抬头看向回廊尽头那扇合上的门。",
	"register_rooms":       "东院四间偏房分列回廊两侧。林岚停在听房，周砚弯腰看灯房门轴，许栀用蓝色发圈夹住纸房的入住须知。",
	"register_luggage":     "四只小旅行包靠在各自门边。残页与念珠已放上门房矮桌，红烛还要在晚膳后的回廊领取。",
	"refectory_porridge":   "周砚的木勺停在半空，米粒间露出一缕像肉丝的纤维。他忽然出声，桌边的人一起看向粥碗。",
	"refectory_lamp":       "陆沉放下手里的灯，解释肉食只为照顾外来客人的口味，僧人自己不吃；他把馒头和素菜往桌边让了让。",
	"refectory_table":      "粥碗旁的馒头还冒着热气，咸菜、笋干和香菇青菜摆在桌中央。林岚放下相机盖，许栀把蒸笼推近。",
	"refectory_bread":      "许栀把盛馒头的蒸笼挪到众人手边，示意先夹咸菜和笋干；周砚的勺子仍停在碗沿。",
	"refectory_curtain":    "长明灯把慧普的半张脸投在帘后。他没有动勺，温和的声音却压过了桌边的窃语。",
	"corridor_candles":     "天色转成靛蓝。陆沉边走边逐人递出红烛，烛面划痕在檐灯下像细小指甲印。",
	"corridor_warning":     "陆沉把食指竖在唇前。四扇偏房门下，檐灯同时轻轻晃了一下，回廊里的声音压低了。",
	"corridor_lamp":        "周砚抬头看刚亮起的檐灯，视线移到封闭钟楼门；门锁在暗处留着一小点冷光。",
	"corridor_lock":        "陆沉俯身确认钟楼门锁，报时的更锣从门外传来；回廊尽头的灯影没有跟着声源移动。",
	"corridor_two_gongs":   "两声打更的锣从封闭钟楼方向传来。陆沉站在各自房门前，示意众人早些休息。",
	"room_candle":          "火柴擦亮，红烛的火苗终于站稳。烛光落在门闩、残页与念珠上，床脚仍暗着。",
	"room_history":         "摊开的游客寺史册停在顾怀山的记载。‘验身’一栏只剩一排被撕断的纸齿。",
	"room_scripture":       "薄蓝经书摊在烛前。四句短偈沿着纸页末行写下，窗纸上的树影从字间慢慢移过。",
	"listen_skin":          "半掩的门里，慧普背对走廊。撑起的后背只有一层缝合的人皮，他的手正在床沿剥下一整片肩背皮。",
	"listen_vase":          "脚后跟碰到花瓶，瓷片碎在脚边。慧普的手停住，所有廊灯同时压暗，他正转向这扇门。",
	"oracle_cast":          "两片杯筊在灯下翻转，落向偏殿地砖。神公低头看着杯面，门外脚步仍在逼近。",
	"oracle_rescue":        "杯筊一平一凸。神公站起身，提起桌边的引路红烛，灯线沿着回廊通往门房。",
	"oracle_stone":         "两片杯面朝着同一边。神公的指尖先变灰，石色爬过衣领；他身后的佛像多了一张相同的脸。",
	"double_candle":        "同行人蹲在红烛另一侧，伸手遮住火焰。它的呼吸没有白雾，影子的边缘在地上断开。",
	"double_exit":          "同行人把手搭上门闩，反复说只看一眼。衣领下，一条细缝正随着说话拉开。",
	"double_frenzy":        "它猛地抓向自己的脸，冲出半开的门。门闩还在你手边，红烛仍然亮着。",
	"double_calm":          "四句偈落下，红烛逐次站稳。同行人伏到床脚，抓挠声终于停了。",
	"dawn_knocks":          "窗纸仍黑。三下敲门从门外传来，熟悉的人声说天亮了，门缝却没有一丝晨光。",
	"dawn_wait":            "你守着红烛等候。门外的呼吸逐渐远去，下一组更锣到来前，窗纸先显出淡青色。",
	"dawn_axis":            "周砚蹲在门轴旁，指腹悬在新划痕上方；他没有碰，只把门的方向记进修缮图。",
	"dawn_gate":            "晨光照进山门。林岚带着相机，周砚收起修缮图，许栀抱着旅行包，陆沉伸手接回通行凭。",
}

func miniShot(state *State, key string) {
	state.ShotKey = key
	if key == "dawn_gate" {
		state.SceneName = "山门·晨光送客"
		state.RoomName = "红烛寺山门"
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
	for name, id := range map[string]string{"陆沉": "keeper", "林岚": "linlan", "周砚": "zhouyan", "许栀": "xuzhi", "慧普": "huipu", "神公": "shangong", "赵熙": "player", "你": "player"} {
		if speaker == name || strings.HasPrefix(speaker, name+"（") || strings.HasPrefix(speaker, name+"·") {
			return id
		}
	}
	return ""
}
