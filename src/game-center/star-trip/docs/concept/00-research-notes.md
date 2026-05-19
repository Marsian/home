# 00. 调研笔记

## 关键参考：《A Short Hike》

《A Short Hike》由 Adam Robinson-Yu 开发，Mark Sparling 作曲。官方 press kit 记录了它的发布日期、平台、作者与基础卖点：玩家在 Hawk Peak Provincial Park 中徒步、攀爬、滑翔，沿路遇到其他徒步者、发现隐藏宝物，并以自己的节奏抵达山顶。官方特性还特别强调钓鱼、游泳、收集隐藏宝物、与 NPC 互相帮助，以及会随探索动态变化的音乐。

参考来源：

- Official press kit: https://www.ashorthike.com/press/index.html
- PlayStation Blog, Adam Robinson-Yu 设计回顾: https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/

## 《A Short Hike》的可迁移设计经验

1. 小地图不是内容少，而是密度高  
   它把“登顶”作为清晰终点，但路径不强制。主线目标稳定，玩家在旁路上获得移动能力、金币、道具、小游戏和 NPC 关系。`star-trip` 应该也有一个很简单的终点：抵达山顶通讯塔并联系母星，但真正的体验来自绕路。

2. 移动能力就是探索奖励  
   金羽毛并不是数值膨胀，而是让玩家更自由地攀爬、滑翔和抵达可见目标。`star-trip` 的等价物是能量块：它们提升喷气背包的起飞高度和滑翔续航，也让玩家逐步接近山顶通讯塔。

3. 叙事是轻的，但人物是具体的  
   PlayStation Blog 里 Adam 提到自己用像朋友短信一样的方式写对白。NPC 不需要长篇剧情，但要有一句能记住的话、一个正在做的事、一个小麻烦。`star-trip` 的 NPC 应该有生活作息，而不是只站在原地发任务。

4. 视觉克制但轮廓清晰  
   《A Short Hike》选择低分辨率、平面阴影、无抗锯齿和柔和轮廓来保证 3D 像素风的可读性。`star-trip` 可使用低多边形 3D + toon material + 像素化输出作为第一方向，但要避免过度噪点和过暗场景。

5. 音乐是空间系统，不只是背景循环  
   Mark Sparling 的动态音乐方案会根据地点和移动状态淡入不同乐器。`star-trip` 即使先用生成式音乐，也应设计分层：主旋律、行走层、钓鱼层、夜晚层、灯塔/目标层，后续再决定是否用 WebAudio 做实时混音。

## 相近独立游戏参考

### Lil Gator Game

Steam 页面强调 open-world、movement-focused adventure、每座小山上都有朋友需要帮助、没有血条压力、用收集素材来制作新玩具和能力。它对 `star-trip` 的启发是：让能力来自“玩具感”的道具，而不是严肃 RPG 成长。

参考来源：https://store.steampowered.com/app/1586800/Lil_Gator_Game/

### Alba: A Wildlife Adventure

官方网站把它称作 feel-good game，核心是地中海岛屿、野生动物探索、拍照、做好事、按自己的节奏游玩。它对 `star-trip` 的启发是：收集不只是填清单，可以服务于修复世界、认识环境和建立玩家对地点的感情。

参考来源：https://www.albawildlife.com/?lang=en

### Haven Park

官网明确写到 tiny and peaceful open world、与露营者交谈、寻找资源建造营地、让游客开心，并说明受到《A Short Hike》和《Animal Crossing》启发。它对 `star-trip` 的启发是：小世界里的建设与经营应当轻量，只改变少量关键地点，但让玩家能看到居民生活因此变好。

参考来源：https://havenparkgame.com/

### TOEM

TOEM 的核心不是大地图，而是观察、拍照、解决小问题。它对 `star-trip` 的启发是：世界中的“发现”可以来自视角和注意力，不一定来自复杂系统。小星球很适合加入“从某个角度看到星座连线 / 遗迹轮廓”的轻谜题。

参考来源：https://toem.fandom.com/wiki/Camera

## 对 `star-trip` 的设计结论

- 游戏体量目标：主线 90-150 分钟，完整收集 4-6 小时。
- 世界目标：一个半径有限但垂直和环绕路线充足的小星球，山顶通讯塔始终作为清晰远景目标。
- 主线驱动：坠毁火箭、损坏通讯装置、喷气背包升级、收集能量块、抵达通讯塔、联络母星。
- 玩法比例：探索 45%，NPC/交换 20%，种植养成 13%，钓鱼 12%，轻谜题/收集 10%。
- 情绪关键词：夏末、星光、轻旅行、坠毁后的安心感、有人等你回家。
- 设计红线：不做大型生存建造，不做高压日程，不做复杂战斗，不做任务列表驱动的大地图清单。
