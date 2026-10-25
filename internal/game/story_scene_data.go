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
		name:     "晴天下午·红烛寺山门",
		text:     "阳光从大巴车窗斜进来，红烛寺的山门在树影中一明一暗。",
		props:    []string{"大巴", "大巴票", "手机预约单", "四只旅行包", "相机", "折叠修缮图", "蓝色发圈", "香客指示牌", "红烛寺山门", "明照寺旧匾", "山门铜铃", "晒太阳的花猫"},
		room:     "gate",
		roomName: "红烛寺山门",
	},
	"mini_register": {
		key:      "mini_register",
		name:     "登记桌·东院入口",
		text:     "登记桌旁挂着‘听、灯、纸、门’四把旧铜牌，陆沉正等你们写下名字。",
		props:    []string{"登记簿", "铜钥匙", "通行凭", "四把房牌", "四只旅行包", "念珠", "残页", "相机盖", "折叠修缮图", "蓝色发圈"},
		room:     "register",
		roomName: "登记桌",
	},
	"mini_refectory": {
		key:      "mini_refectory",
		name:     "斋堂晚膳",
		text:     "夕阳落进斋堂格窗，四碗粥冒着热气，旁边摆着馒头、咸菜、笋干和香菇青菜等本地素菜，热水放在桌角。",
		props:    []string{"四只带碗签的粥碗", "四碗粥", "木勺", "馒头", "咸菜", "本地笋干", "香菇青菜", "热水", "施食记残页", "帘后长明灯"},
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
		text:     "半掩房门透出暗红灯光，皮革撕裂声从门内传来；墙边花瓶贴着你的脚后跟。",
		props:    []string{"花瓶", "半掩房门", "猫食碟", "鸟笼", "红烛"},
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
		name:     "门房·五更与远处一声锣",
		text:     "五声更锣之后又响了一声更低、更长的锣；窗外仍然很黑。",
		props:    []string{"五声更锣", "远处一声低长锣", "门闩", "红烛"},
		room:     "room_door",
		roomName: "门房",
	},
	"mini_dawn": {
		key:      "mini_dawn",
		name:     "东院·五更天亮",
		text:     "真正的五声更锣传来，鸡鸣和晨光一起越过东院。四个人都还在。",
		props:    []string{"行李", "通行凭", "大巴", "相机", "明照寺旧匾"},
		room:     "gate",
		roomName: "东院回廊",
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
