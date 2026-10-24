package game

// storyScene contains the small amount of presentation data needed by the
// client while the mini-script is being played. The actual progression lives
// in State.Flags so it is saved together with the normal game snapshot.
type storyScene struct {
	key      string
	name     string
	text     string
	props    []string
	room     string
	roomName string
}

var miniScenes = map[string]storyScene{
	"mini_arrival": {
		key:      "mini_arrival",
		name:     "晴天下午·灯影寺山门",
		text:     "阳光从大巴车窗斜进来，灯影寺的山门在树影中一明一暗。",
		props:    []string{"大巴", "灯影寺山门", "明照寺旧匾", "山门铜铃", "晒太阳的花猫"},
		room:     "gate",
		roomName: "灯影寺山门",
	},
	"mini_register": {
		key:      "mini_register",
		name:     "登记桌·东院入口",
		text:     "登记桌旁挂着‘听、灯、纸、门’四把旧铜牌，陆沉正等你们写下名字。",
		props:    []string{"登记簿", "铜钥匙", "通行凭", "四把房牌", "四只旅行包"},
		room:     "register",
		roomName: "登记桌",
	},
	"mini_refectory": {
		key:      "mini_refectory",
		name:     "斋堂晚膳·肉粥",
		text:     "夕阳落进斋堂格窗，四碗油花不散的粥摆在桌上，素饼和热水放在一旁。",
		props:    []string{"四碗肉粥", "木勺", "素饼", "热水", "施食记残页", "帘后长明灯"},
		room:     "refectory",
		roomName: "斋堂",
	},
	"mini_corridor_candle": {
		key:      "mini_corridor_candle",
		name:     "东院回廊·二更",
		text:     "天色从金黄转成靛蓝，陆沉在四扇偏房门前逐人发放红烛。",
		props:    []string{"四间偏房", "红烛", "檐灯", "封闭钟楼门", "回廊拖痕"},
		room:     "corridor",
		roomName: "东院回廊",
	},
	"mini_room": {
		key:      "mini_room",
		name:     "门房·红烛与经文",
		text:     "房内有床、窗、矮桌和一盏未点的油灯，桌上放着游客版寺史册与《清心静神经》。",
		props:    []string{"红烛", "游客版寺史册", "清心静神经", "残页", "念珠", "偏房窗"},
		room:     "room_door",
		roomName: "门房",
	},
	"mini_wake_three_gongs": {
		key:      "mini_wake_three_gongs",
		name:     "门房·三声锣后",
		text:     "三声沉闷的锣把你惊醒。红烛已经熄灭，月光照着一条无人回廊，门外传来湿重的呼吸声。",
		props:    []string{"熄灭的红烛", "凝固的蜡泪", "门缝红蜡", "月光回廊", "门闩"},
		room:     "room_door",
		roomName: "门房",
	},
	"mini_four_knocks": {
		key:      "mini_four_knocks",
		name:     "门房·四敲空门",
		text:     "完整的四下敲门后，门眼里只有一条被月光切开的空走廊。",
		props:    []string{"门眼", "门闩", "门缝红蜡", "月光", "红烛"},
		room:     "room_door",
		roomName: "门房",
	},
	"mini_three_knocks": {
		key:      "mini_three_knocks",
		name:     "东院回廊·三敲同行",
		text:     "三下敲门后，一个熟悉的声音说自己看见住持进了同伴的房间。",
		props:    []string{"三敲门声", "同行人的私物", "红烛", "门眼"},
		room:     "room_door",
		roomName: "门房",
	},
	"mini_listen": {
		key:      "mini_listen",
		name:     "偏房门口·剥皮现场",
		text:     "慧普住持背后没有骨肉，只有一层被撑起的人皮；花瓶已经被你碰倒。",
		props:    []string{"碎花瓶", "半掩房门", "猫食碟", "鸟笼", "红烛"},
		room:     "corridor",
		roomName: "东院回廊",
	},
	"mini_oracle": {
		key:      "mini_oracle",
		name:     "大殿偏殿·神公桌",
		text:     "神公把杯筊推到灯下，只让你问一件事。",
		props:    []string{"杯筊", "猫食碟", "鸟笼", "引路红烛"},
		room:     "corridor",
		roomName: "大雄宝殿",
	},
	"mini_double": {
		key:      "mini_double",
		name:     "门房·换皮同伴",
		text:     "它的衣服和口头禅都对，烛光却照不到它影子的边缘。",
		props:    []string{"红烛", "床脚", "缝线", "清心静神经"},
		room:     "room_door",
		roomName: "门房",
	},
	"mini_dawn_trap": {
		key:      "mini_dawn_trap",
		name:     "门房·五更与一声钟",
		text:     "五声更锣之后又响了一声更低、更长的钟；窗外仍然很黑。",
		props:    []string{"五声更锣", "一声钟", "门闩", "红烛"},
		room:     "room_door",
		roomName: "门房",
	},
	"mini_dawn": {
		key:      "mini_dawn",
		name:     "山门·五更天亮",
		text:     "真正的五声更锣传来，鸡鸣和晨光一起越过东院。四个人都还在。",
		props:    []string{"行李", "通行凭", "大巴", "相机", "明照寺旧匾"},
		room:     "gate",
		roomName: "灯影寺山门",
	},
	"mini_ending": {
		key:      "mini_ending",
		name:     "返程·后视镜里的旧匾",
		text:     "大巴驶下山道，后视镜里‘明照寺’三个旧字在晨雾中闪了一下。",
		props:    []string{"大巴", "后视镜", "残页", "通行凭"},
		room:     "gate",
		roomName: "山下公路",
	},
	"mini_death": {
		key:      "mini_death",
		name:     "红烛熄灭·死亡反馈",
		text:     "黑影撞开房门，画面停在红烛熄灭前的一瞬。你可以重新开始这一夜。",
		props:    []string{"熄灭的红烛", "断裂的念珠", "半开的房门"},
		room:     "room_door",
		roomName: "门房",
	},
}

func (e *Engine) setMiniScene(state *State, key string) {
	scene, ok := miniScenes[key]
	if !ok {
		return
	}
	state.SceneKey = scene.key
	state.SceneName = scene.name
	state.SceneText = scene.text
	state.SceneProps = append([]string{}, scene.props...)
	state.Room = scene.room
	state.RoomName = scene.roomName
	state.Overlay = ""
	state.FocusItem = ""
}

func miniSystem(state *State, text string) string {
	return feedback(state, text)
}

func miniDialogue(state *State, speaker, text string) string {
	state.Dialogue = Dialogue{Speaker: speaker, Text: text}
	state.LastAction = text
	return text
}

func miniClue(state *State, clue string) {
	for _, existing := range state.Clues {
		if existing == clue {
			return
		}
	}
	state.Clues = append(state.Clues, clue)
}

func miniSetFlag(state *State, key string) {
	if state.Flags == nil {
		state.Flags = map[string]bool{}
	}
	state.Flags[key] = true
}

func miniHasAny(text string, words ...string) bool { return Has(text, words...) }
