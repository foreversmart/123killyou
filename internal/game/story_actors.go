package game

func actor(id, name, role, position, portrait, status string) SceneActor {
	return SceneActor{ID: id, Name: name, Role: role, Position: position, Portrait: portrait, Status: status, Visible: true}
}

const protagonistName = "赵熙"

func miniSceneActors(key string) []SceneActor {
	actors := map[string][]SceneActor{
		"mini_arrival": {
			actor("player", protagonistName, "游客·主角", "山门外石阶 / 第一视角", "player", "随意环顾，听见车门和脚步"),
			actor("linlan", "林岚", "摄影爱好者", "山门左侧台阶 / 边走边取相机", "", "缓步换取景点，驻足举相机，与同伴聊天"),
			actor("zhouyan", "周砚", "古建筑爱好者", "新匾侧前方 / 绕行观察", "", "缓步换观察角度，驻足仰看旧字和梁架"),
			actor("xuzhi", "许栀", "同行游客", "山门前行李旁 / 缓步环顾", "", "行李已靠墙，驻足看檐角并回头招呼同伴"),
			actor("luchen", "陆沉", "守夜人和尚", "山门内侧 / 迎客与让路", "keeper", "驻足迎客、缓步让位，双手保持静止，用对白说明登记方向"),
		},
		"mini_register": {
			actor("player", protagonistName, "游客·主角", "登记桌前沿 / 与大家围桌", "player", "俯身看登记簿，等陆沉确认登记"),
			actor("luchen", "陆沉", "守夜人和尚", "登记桌内侧 / 核对登记", "keeper", "双手保持静止，抬眼确认来客与房间"),
			actor("linlan", "林岚", "摄影爱好者", "登记桌左侧 / 靠窗一角", "", "扶着相机观察院景，偶尔回身看行李"),
			actor("zhouyan", "周砚", "古建筑爱好者", "登记桌右前角 / 门槛附近", "", "探身看登记簿和桌边拖痕，向偏殿方向张望"),
			actor("xuzhi", "许栀", "同行游客", "登记桌外侧 / 手按入住须知", "", "靠近桌边看陆沉登记，整理发圈和纸页"),
		},
		"mini_refectory": {
			actor("player", protagonistName, "游客·主角", "斋堂东侧饭桌", "player", "端着粥碗"),
			actor("linlan", "林岚", "摄影爱好者", "饭桌左侧", "", "观察油花"),
			actor("zhouyan", "周砚", "古建筑爱好者", "饭桌对面", "", "检查碗签"),
			actor("xuzhi", "许栀", "同行游客", "饭桌右侧", "", "拿着馒头"),
			actor("luchen", "陆沉", "守夜人和尚", "斋堂门边", "keeper", "双手保持静止，站在边上观察供食"),
			actor("huipu", "慧普", "红烛寺住持", "帘后长明灯旁", "", "只露半张脸"),
		},
		"mini_corridor_candle": {
			actor("player", protagonistName, "游客·主角", "门房门前", "player", "接红烛"),
			actor("luchen", "陆沉", "守夜人和尚", "回廊中央", "keeper", "双手保持静止，用对白告知红烛领取与寺规"),
			actor("linlan", "林岚", "摄影爱好者", "听房门口", "", "压低声音打趣"),
			actor("zhouyan", "周砚", "古建筑爱好者", "灯房门口", "", "数更锣"),
			actor("xuzhi", "许栀", "同行游客", "纸房门口", "", "抱紧入住须知"),
		},
		"mini_room": {
			actor("player", protagonistName, "游客·主角", "门房矮桌前", "player", "点烛 / 阅读"),
			actor("luchen", "陆沉", "守夜人和尚", "回廊门外（不可见）", "keeper", "双手保持静止，巡门"),
		},
		"mini_wake_three_gongs": {
			actor("player", protagonistName, "游客·主角", "门房床上", "player", "惊醒"),
			actor("unknown", "门外不明影子", "邪祟", "门缝外", "", "呼吸 / 刮门"),
		},
		"mini_four_knocks": {
			actor("player", protagonistName, "游客·主角", "门闩后", "player", "听四敲"),
			actor("unknown", "四敲者", "身份未明", "门外走廊", "", "无回应"),
		},
		"mini_three_knocks": {
			actor("player", protagonistName, "游客·主角", "门房门内", "player", "核对声音"),
			actor("companion_voice", "同行人的声音", "身份未明", "门外三步处", "", "敲三下"),
		},
		"mini_listen": {
			actor("player", protagonistName, "游客·主角", "偏房门外 / 门缝前", "player", "贴墙从门缝向内偷看"),
			actor("companion", "同行者", "同行者", "偏房门外回廊 / 你身后半步", "", "屏住呼吸，留在门外"),
			actor("huipu", "慧普", "红烛寺住持", "半掩房门内 / 床侧地面", "", "站在床边，俯身对床上人动手"),
		},
		"mini_oracle": {
			actor("player", protagonistName, "游客·主角", "大殿东侧偏殿", "player", "逃入"),
			actor("shangong", "神公", "守杯筊的殿前人", "杯筊桌后", "", "等你掷筊"),
			actor("huipu", "慧普", "红烛寺住持", "大殿门外远处", "", "逼近"),
		},
		"mini_double": {
			actor("player", protagonistName, "游客·主角", "门房床边", "player", "守住红烛"),
			actor("skin_double", "换皮同行人", "同行者", "门房门内", "", "影子不完整"),
		},
		"mini_dawn_trap": {
			actor("player", protagonistName, "游客·主角", "门房床边", "player", "等待五更"),
			actor("unknown", "门外声音", "身份未明", "门外黑暗", "", "假报五更"),
		},
		"mini_dawn": {
			actor("player", protagonistName, "游客·主角", "山门台阶", "player", "确认天亮"),
			actor("linlan", "林岚", "摄影爱好者", "大巴车旁", "", "检查相机"),
			actor("zhouyan", "周砚", "古建筑爱好者", "旧匾下", "", "确认四人"),
			actor("xuzhi", "许栀", "同行游客", "行李车旁", "", "松开蓝色发圈"),
			actor("luchen", "陆沉", "守夜人和尚", "山门阴影内", "keeper", "双手保持静止，送客"),
		},
		"mini_ending": {
			actor("player", protagonistName, "游客·主角", "大巴后排靠窗", "player", "回望旧匾"),
			actor("linlan", "林岚", "摄影爱好者", "左侧车窗", "", "翻看黑照片"),
			actor("zhouyan", "周砚", "古建筑爱好者", "过道旁", "", "画门轴"),
			actor("xuzhi", "许栀", "同行游客", "右侧车窗", "", "握着蓝色发圈"),
		},
		"mini_death": {
			actor("player", protagonistName, "游客·主角", "门房门内", "player", "红烛熄灭"),
			actor("evil", "门外黑影", "恶愿残念", "门缝外", "", "撞门"),
		},
	}
	return append([]SceneActor{}, actors[key]...)
}
