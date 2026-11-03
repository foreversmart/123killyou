from pathlib import Path
from html import escape

W,H=3840,2160
INK='#263e3d'; GOLD='#a97939'; RED='#9b4038'; PAPER='#f2e8d4'; MUTED='#685f50'
parts=[f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L12,6 L0,12 Z" fill="{INK}"/></marker>
<marker id="gold_arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L12,6 L0,12 Z" fill="{GOLD}"/></marker>
<marker id="red_arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L12,6 L0,12 Z" fill="{RED}"/></marker>
<filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#241c15" flood-opacity=".10"/></filter>
</defs>
<g font-family="PingFang SC, Heiti SC, STHeiti, sans-serif" fill="{INK}">''']

def rect(x,y,w,h,fill=PAPER,stroke=INK,sw=2,r=18,opacity=None):
    op=f' opacity="{opacity}"' if opacity else ''
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{op}/>')
def txt(x,y,s,size=34,fill=INK,weight=400,anchor='start',family=None):
    fam=f' font-family="{family}"' if family else ''
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{anchor}"{fam}>{escape(s)}</text>')
def lines(x,y,seq,size=34,gap=48,fill=INK,weight=400):
    for i,s in enumerate(seq):txt(x,y+i*gap,s,size,fill,weight)
def edge(points,color=INK,sw=3,dash=None,arrow=True):
    ps=' '.join(f'{x},{y}' for x,y in points)
    marker={'#263e3d':'arrow','#a97939':'gold_arrow','#9b4038':'red_arrow'}[color]
    extras=(f' marker-end="url(#{marker})"' if arrow else '')+(f' stroke-dasharray="{dash}"' if dash else '')
    parts.append(f'<polyline points="{ps}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"{extras}/>')
def label(x,y,s,fill=MUTED,size=30,anchor='middle'):
    txt(x,y,s,size,fill,500,anchor)
def card(x,y,w,h,title,body=(),color=INK,fs=36,bodyfs=32):
    rect(x,y,w,h,stroke=color)
    parts.append(f'<path d="M{x+18},{y} H{x+w-18} Q{x+w},{y} {x+w},{y+18} V{y+15} H{x} V{y+18} Q{x},{y} {x+18},{y}Z" fill="{color}"/>')
    txt(x+26,y+57,title,fs,color,650)
    lines(x+26,y+105,body,bodyfs,44,INK)
def badge(x,y,s,color=INK):
    parts.append(f'<circle cx="{x}" cy="{y}" r="27" fill="{color}"/>')
    txt(x,y+12,s,34,PAPER,650,'middle')
def fail(x,y,w,text):
    rect(x,y,w,62,fill='#ead9cc',stroke=RED,r=13)
    txt(x+20,y+42,text,30,RED,600)
    badge(x+w-38,y+31,'D',RED)
def group(y,h,num,title,sub):
    rect(70,y,3700,h,fill='#eee3cc',stroke='#b6a58b',sw=1,r=24,opacity='.86')
    rect(70,y,245,h,fill=INK,stroke=INK,r=24)
    txt(192,y+75,num,54,PAPER,700,'middle')
    for i,c in enumerate(title):txt(192,y+155+i*54,c,46,PAPER,600,'middle')
    if sub:txt(192,y+h-38,sub,24,'#cfbd9b',500,'middle')

# Title and legend
parts.append('<rect x="70" y="65" width="2040" height="192" rx="8" fill="#f2e8d4" opacity=".72"/>')
parts.append('<path d="M88,92 H330" stroke="#9b4038" stroke-width="7"/>')
txt(88,185,'红烛无声',104,INK,600,family='Songti SC, STSong, serif')
txt(720,180,'首夜十二幕 · 核心事件分支图',64,INK,600)
txt(92,245,'从晴日下午入住，到午夜辨声求生，再守到真正的五更。',34,MUTED)
edge([(2550,216),(2630,216)],INK)
txt(2652,228,'主线',30,INK)
edge([(2820,216),(2900,216)],GOLD)
txt(2922,228,'生还路径',30,GOLD)
badge(3210,216,'D',RED);txt(3255,228,'统一死亡结算',30,RED)

# Act 1
GROUP1=(280,500)
group(*GROUP1,'壹','入寺准备','01—06')
card(380,325,530,160,'01—02｜抵达与入住',['四人乘大巴抵寺','陆沉登记、分房、交钥匙'])
card(980,325,650,160,'03｜斋堂晚膳',['粥中发现肉丝，可吃／拒绝／暂缓','可逐一劝林岚、周砚、许栀吃素'])
card(1700,325,570,160,'04｜回廊领烛 · 二更',['陆沉嘱咐：夜间慎出、红烛勿灭','玩家主动领烛，回“门”房'])
card(2340,325,610,160,'05｜门房点烛、读经、入睡',['寺史缺失“验身”记录','读《大念处经》可解锁安抚'])
card(3020,325,650,160,'06｜三更惊醒 · 红烛已熄',['三声更锣后醒来，必须续燃红烛','续燃后湿重呼吸与拖行退远'])
for x1,x2 in [(910,980),(1630,1700),(2270,2340),(2950,3020)]:edge([(x1,405),(x2-9,405)])
# Choice consequences
edge([(1305,485),(1305,545)],GOLD)
rect(980,545,1290,175,fill='#e6dfc9',stroke=GOLD,r=15)
txt(1007,590,'晚膳决定后续处境',34,GOLD,650)
lines(1007,638,['三位同伴全吃 → 无可靠同伴，不能直接跑回房','本人吃粥，或三位同伴全吃 → 回房出现换皮同行人'],31,45)
fail(2340,570,610,'未点烛就睡下 → ')
fail(3020,570,650,'明确不续燃 → ')
label(2650,696,'经文四句：观身如身 · 观受如受',MUTED,28)
label(2650,734,'观心如心 · 观法如法',MUTED,28)
edge([(2645,485),(2645,560)],RED)
edge([(3300,485),(3300,560)],RED)
edge([(3670,405),(3730,405),(3730,660),(3600,660),(3600,710)],GOLD)
badge(3600,738,'A',GOLD);label(3515,752,'续燃',GOLD,30,'end')

# Act 2
group(820,650,'贰','午夜求生','07—09')
badge(378,905,'A',GOLD)
edge([(407,905),(440,905)])
card(440,860,620,165,'07｜四敲空门',['门眼外空廊，喊话没有回应','不开门，等四敲过去'])
card(1140,860,620,165,'08｜三敲 · 核验同行人',['三敲后才有人声，自称同伴','先核对房牌、私物等身份细节'])
card(1840,860,680,165,'08｜偷听剥皮 · 碰倒花瓶',['慧普伏在暗处，撕裂与低念传出','鞋跟碰碎花瓶，慧普停下回头'])
card(2910,860,760,165,'09｜跑向大殿，求神公引路',['说清只求回房，再掷一次杯筊','诚意、虔诚参与判定；本人吃粥降低成功率'],bodyfs=30)
edge([(1060,945),(1131,945)])
edge([(1760,945),(1831,945)])
edge([(2520,945),(2901,945)])
label(2715,924,'跑向大殿',INK,30)
# knocks branch
edge([(750,1025),(750,1090)],GOLD,arrow=False)
label(750,1135,'喊话：每句扣 2 点虔诚度，仍留此处',MUTED,29)
fail(440,1170,620,'四敲时开门 → ')
edge([(1030,1025),(1030,1160)],RED)
label(1450,1100,'三敲不等于安全，声音不能单独证明身份',MUTED,29)
# escape choices
edge([(2180,1025),(2180,1115)],GOLD,arrow=False)
edge([(2180,1115),(1790,1115),(1790,1160)],GOLD)
edge([(2180,1115),(2480,1115),(2480,1160)],GOLD)
card(1420,1160,740,140,'模仿已听过的猫／鸟叫',['慧普被引开 → 撤回门房'],GOLD,34,32)
card(2240,1160,630,140,'真同伴在场 ＋ 红烛亮',['立刻跑回“门”房并关门'],GOLD,34,32)
# oracle results
edge([(3290,1025),(3290,1070)],INK,arrow=False)
edge([(3290,1070),(3090,1070),(3090,1160)],GOLD)
edge([(3290,1070),(3495,1070),(3495,1160)],RED)
card(2930,1160,320,140,'圣筊',['神公持烛带回房'],GOLD,34,29)
card(3320,1160,350,140,'笑筊／阴筊',['神公石化 → 死亡 D'],RED,34,29)
# safe join + failures
edge([(1790,1300),(1790,1380)],GOLD,arrow=False)
edge([(2555,1300),(2555,1380)],GOLD,arrow=False)
edge([(3090,1300),(3090,1380),(1790,1380)],GOLD,arrow=False)
edge([(2555,1380),(1420,1380),(1420,1415)],GOLD)
badge(1420,1435,'B',GOLD)
label(1510,1447,'成功回房 → 按晚膳状态判断是否进入第10幕',GOLD,30,'start')
fail(440,1300,760,'跑向后山／钟楼／陌生偏房 → ')
label(440,1425,'未模仿时：无同伴直接跑回／回房烛灭 → 失败 D',RED,27,'start')

# Act3
group(1510,470,'叁','守到真晓','10—12')
badge(378,1595,'B',GOLD)
edge([(407,1595),(445,1595)],GOLD)
card(445,1545,650,165,'回房后：是否触发换皮者？',['本人吃粥，或三位同伴全吃 → 是','否则跳过第10幕'],INK,34,31)
card(1205,1545,1130,340,'10｜换皮同伴：守住红烛与房门',[],INK,38)
lines(1235,1650,['拒绝“吹灭红烛”与“跟我出去”两次诱导','已读经 → 连续四句《大念处经》 → 安抚成功','未读／中断 → 它狂躁冲出 → 不跟、立即关门守烛'],32,54)
fail(1235,1810,1070,'吹灭红烛，或跟着冲出房间 → ')
edge([(1095,1627),(1196,1627)],GOLD)
label(1148,1605,'是',GOLD,29)
# no route goes under condition and to11 without entering10
edge([(770,1710),(770,1940),(2410,1940),(2410,1627),(2460,1627)],GOLD)
label(955,1930,'否：保持房内烛火，跳过换皮事件',GOLD,29,'start')
card(2460,1545,535,165,'11｜四锣一钟 · 假报晓',['窗纸仍黑，低长钟不是第五锣','继续辨声，不开门'],INK,35,29)
edge([(2335,1627),(2451,1627)],GOLD)
card(3095,1545,575,165,'误判天亮 → 门外三敲',['熟悉的声音劝开门做早课','仍可拒绝开门，继续等待'],INK,34,30)
edge([(2995,1627),(3086,1627)])
fail(3095,1735,575,'假报晓时开门 → ')
card(2460,1795,535,130,'不开门，等真正五更',['五锣 ＋ 鸡鸣 ＋ 檐鸟 ＋ 晨光'],GOLD,33,29)
edge([(2727,1710),(2727,1786)],GOLD)
edge([(3382,1710),(3382,1722),(3015,1722),(3015,1860),(2995,1860)],GOLD)
card(3095,1810,575,160,'12｜平安离寺 · 余悸',['四人重聚，归还通行凭、主动上车','首夜生还；慧普恶愿尚未解除'],GOLD,34,29)
edge([(2995,1860),(3086,1860)],GOLD)

# shared death and retry footer
parts.append('<rect x="70" y="1998" width="950" height="142" rx="12" fill="#f2e8d4" opacity=".92"/>')
badge(112,2074,'D',RED)
txt(162,2054,'统一失败结局：红烛熄灭',38,RED,700)
txt(162,2108,'鬼影冲入；由玩家决定重试或重新开始。',31,RED)
edge([(905,2072),(1010,2072)],RED)
rect(1045,2010,1840,128,fill='#eadcc5',stroke='#b6a58b',sw=1,r=16)
txt(1075,2058,'从最近安全节点重试',35,INK,650)
txt(1075,2108,'保留本局进食、学经和道具调查；杯筊失败回到08，不重放整段偷听。',31,INK)
txt(2970,2058,'阅读方式：阶段从左到右',31,MUTED,500)
txt(2970,2108,'A／B为跨阶段连接；D汇总死亡。',30,MUTED)
parts.append('</g></svg>')
path=Path('output/imagecreate/story_branch_flowchart.svg')
path.write_text('\n'.join(parts),encoding='utf-8')
print(path.resolve())
