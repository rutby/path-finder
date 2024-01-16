# 任务拆解

带RVO的流场寻路
* 关卡编辑器(done tilemap)
* heatmap生成
    * 数据结构优化
        * 链表 查(N), 删(N), 加(1)
        * 数组 查(N), 删(>N), 加(1)

# 指标记录

* 50x50 & `Date().getTime()` => 23ms
* 50x50 & Performance Tools => 11ms
* 