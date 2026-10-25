package game

func actor(id, name, role, position, portrait, status string) SceneActor {
	return SceneActor{ID: id, Name: name, Role: role, Position: position, Portrait: portrait, Status: status, Visible: true}
}

func miniSceneActors(key string) []SceneActor {
	actors := map[string][]SceneActor{
		"mini_arrival": {
			actor("player", "你", "游客·主角", "大巴车门旁 / 第一视角", "player", "观察中"),
			actor("linlan", "林岚", "摄影爱好者", "大巴车左侧台阶", "", "举着相机"),
			actor("zhouyan", "周砚", "古建筑爱好者", "山门右侧台阶", "", "查看梁架"),
			actor("xuzhi", "许栀", "同行游客", "山门檐下 / 旅行包旁", "", "整理发圈"),
			actor("luchen", "陆沉", "守夜人和尚", "山门内侧", "keeper", "迎接来客"),
		},
		"mini_register": {
			actor("player", "你", "游客·主角", "登记簿前", "player", "写名字"),
			actor("luchen", "陆沉", "守夜人和尚", "登记桌后 / 研墨", "keeper", "用毛笔登记"),
			actor("linlan", "林岚", "摄影爱好者", "听房门边", "", "挂相机盖"),
			actor("zhouyan", "周砚", "古建筑爱好者", "灯房门边", "", "看拖痕"),
			actor("xuzhi", "许栀", "同行游客", "纸房门边", "", "夹入住须知"),
		},
		"mini_refectory": {
			actor("player", "你", "游客·主角", "斋堂东侧饭桌", "player", "端着粥碗"),
			actor("linlan", "林岚", "摄影爱好者", "饭桌左侧", "", "观察油花"),
			actor("zhouyan", "周砚", "古建筑爱好者", "饭桌对面", "", "检查碗签"),
			actor("xuzhi", "许栀", "同行游客", "饭桌右侧", "", "拿着馒头"),
			actor("luchen", "陆沉", "守夜人和尚", "斋堂门帘外", "keeper", "解释供食"),
			actor("huipu", "慧普", "红烛寺住持", "帘后长明灯旁", "", "只露半张脸"),
		},
		"mini_corridor_candle": {
			actor("player", "你", "游客·主角", "门房门前", "player", "接红烛"),
			actor("luchen", "陆沉", "守夜人和尚", "回廊中央", "keeper", "逐人发烛"),
			actor("linlan", "林岚", "摄影爱好者", "听房门口", "", "压低声音打趣"),
			actor("zhouyan", "周砚", "古建筑爱好者", "灯房门口", "", "数更锣"),
			actor("xuzhi", "许栀", "同行游客", "纸房门口", "", "抱紧入住须知"),
		},
		"mini_room": {
			actor("player", "你", "游客·主角", "门房矮桌前", "player", "点烛 / 阅读"),
			actor("luchen", "陆沉", "守夜人和尚", "回廊门外（不可见）", "keeper", "巡门"),
		},
		"mini_wake_three_gongs": {
			actor("player", "你", "游客·主角", "门房床上", "player", "惊醒"),
			actor("unknown", "门外不明影子", "邪祟", "门缝外", "", "呼吸 / 刮门"),
		},
		"mini_four_knocks": {
			actor("player", "你", "游客·主角", "门闩后", "player", "听四敲"),
			actor("unknown", "四敲者", "身份未明", "门外走廊", "", "无回应"),
		},
		"mini_three_knocks": {
			actor("player", "你", "游客·主角", "门房门内", "player", "核对声音"),
			actor("companion_voice", "同行人的声音", "身份未明", "门外三步处", "", "敲三下"),
		},
		"mini_listen": {
			actor("player", "你", "游客·主角", "偏房门侧", "player", "贴墙偷听"),
			actor("companion", "同行者", "同行者", "你身后半步", "", "屏住呼吸"),
			actor("huipu", "慧普", "红烛寺住持", "半掩房门内", "", "剥取人皮"),
		},
		"mini_oracle": {
			actor("player", "你", "游客·主角", "大殿东侧偏殿", "player", "逃入"),
			actor("shangong", "神公", "守杯筊的殿前人", "杯筊桌后", "", "等你掷筊"),
			actor("huipu", "慧普", "红烛寺住持", "大殿门外远处", "", "逼近"),
		},
		"mini_double": {
			actor("player", "你", "游客·主角", "门房床边", "player", "守住红烛"),
			actor("skin_double", "换皮同行人", "同行者", "门房门内", "", "影子不完整"),
		},
		"mini_dawn_trap": {
			actor("player", "你", "游客·主角", "门房床边", "player", "等待五更"),
			actor("unknown", "门外声音", "身份未明", "门外黑暗", "", "假报五更"),
		},
		"mini_dawn": {
			actor("player", "你", "游客·主角", "山门台阶", "player", "确认天亮"),
			actor("linlan", "林岚", "摄影爱好者", "大巴车旁", "", "检查相机"),
			actor("zhouyan", "周砚", "古建筑爱好者", "旧匾下", "", "确认四人"),
			actor("xuzhi", "许栀", "同行游客", "行李车旁", "", "松开蓝色发圈"),
			actor("luchen", "陆沉", "守夜人和尚", "山门阴影内", "keeper", "送客"),
		},
		"mini_ending": {
			actor("player", "你", "游客·主角", "大巴后排靠窗", "player", "回望旧匾"),
			actor("linlan", "林岚", "摄影爱好者", "左侧车窗", "", "翻看黑照片"),
			actor("zhouyan", "周砚", "古建筑爱好者", "过道旁", "", "画门轴"),
			actor("xuzhi", "许栀", "同行游客", "右侧车窗", "", "握着蓝色发圈"),
		},
		"mini_death": {
			actor("player", "你", "游客·主角", "门房门内", "player", "红烛熄灭"),
			actor("evil", "门外黑影", "恶愿残念", "门缝外", "", "撞门"),
		},
	}
	return append([]SceneActor{}, actors[key]...)
}
