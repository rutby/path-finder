import { Config, EnumFlagType, EnumOrientation, IGrid, IPos } from "../Const/Config";
import { MiscUtils } from "./MiscUtils";

var Axis4 = [
    cc.v2(0, 1),
    cc.v2(0, -1),
    cc.v2(-1, 0),
    cc.v2(1, 0),
];

var Axis8 = [
    cc.v2(-1, 1),
    cc.v2(0, 1),
    cc.v2(1, 1),
    cc.v2(1, 0),
    cc.v2(1, -1),
    cc.v2(0, -1),
    cc.v2(-1, -1),
    cc.v2(-1, 0),
];

var GridWidth = Config.GridSize.width;
var GridHeight = Config.GridSize.height;

export class MapUtils {
    //================================================ 
    /** UI坐标转换成格子坐标 */
    static convertViewPosToMapPos(viewPos: IPos): cc.Vec2 {
        return cc.v2(Math.floor(viewPos.x / GridWidth), Math.floor(viewPos.y / GridHeight))
    }
    /** 格子坐标转换成UI坐标 */
    static convertMapPosToViewPos(mapPos: IPos): cc.Vec2 {
        return cc.v2(mapPos.x * GridWidth, mapPos.y * GridHeight);
    }

    /** 
     * 格子坐标转换成索引
     */
    static convertMapPosToIndex(mapSize: cc.Size, posGrid: IPos) {
        return (posGrid.y * mapSize.width) + posGrid.x;
    }

    /** 
     * 索引转换成格子坐标
     */
    static convertIndexToMapPos(mapSize: cc.Size, index: number): IPos {
        var y = Math.floor(index / mapSize.width);
        var x = index % mapSize.width;
        return {x: x, y: y}
    }

    /** 
     * 生成热力图 
     * 数据统计: 
     *      * 50x50 数组 11ms
     */
    static createHeatMap(mapSize: cc.Size, map: IGrid[], target_pos: cc.Vec2) {
        MiscUtils.timeRecordStart('createHeatMap');
        var open_list:{index: number, cost: number}[] = [];
        var close_list:{index: number, cost: number}[] = [];

        var target_index = this.convertMapPosToIndex(mapSize, target_pos);
        var target_node = {index: target_index, cost: 0};
        open_list.push(target_node);
        while(open_list.length > 0) {
            /** 取代价最小的节点 */
            var del_index = 0;
            var selected_node = open_list[del_index];
            for(var i = 0; i < open_list.length; i++) {
                if (selected_node.cost > open_list[i].cost) {
                    del_index = i;
                    selected_node = open_list[i];
                }
            }
            open_list.splice(del_index, 1);
            close_list.push(selected_node);
            
            /** 更新当前点距离 */
            var selected_index = selected_node.index;
            var selected_cost = selected_node.cost;
            map[selected_index].cost = selected_cost;

            /** 获得周边四向邻居 */
            var selected_grid = this.convertIndexToMapPos(mapSize, selected_index);
            var neighors = this.getNeighors(mapSize, selected_grid, Axis4);
            for(var i = 0; i < neighors.length; i++) {
                var neighor_index = this.convertMapPosToIndex(mapSize, neighors[i]);
                var neighor_grid = map[neighor_index];

                /** 排除地形 */
                if (neighor_grid.flag == EnumFlagType.Terrain) {
                    continue;
                }

                /** 排除关闭列表 */
                if (close_list.find(ele => ele.index == neighor_index)) {
                    continue;
                }

                /** 加入/更新开放列表 */
                var neighor_cost = selected_cost + 1;
                var exist_one = open_list.find(ele => ele.index == neighor_index);
                if (!exist_one) {
                    var neighor_node = {index: neighor_index, cost: neighor_cost};
                    open_list.push(neighor_node);
                } else {
                    if (exist_one.cost > neighor_cost) {
                        exist_one.cost = neighor_cost;
                    }
                }
            }
        }
        MiscUtils.timeRecordEnd('createHeatMap');
    }

    static getNeighors(mapSize: cc.Size, posGrid: IPos, Axis: cc.Vec2[]): IPos[] {
        var arr = [];
        for(var i = 0; i < Axis.length; i++) {
            var dir = Axis[i];
            var dst = {x: posGrid.x + dir.x, y: posGrid.y + dir.y};
            if (dst.x >= 0 && dst.x < mapSize.width && dst.y >= 0 && dst.y < mapSize.height) {
                arr.push(dst);
            }
        }
        return arr;
    }

    /**
     * 生成向量图
     */
    static createVectorMap(mapSize: cc.Size, map: IGrid[]) {
        for(let i = 0; i < map.length; i++) {
            var selected_grid = map[i];
            selected_grid.prev = null;
            if (selected_grid.flag == EnumFlagType.Terrain) {
                continue;
            }

            var neighors = this.getNeighors(mapSize, selected_grid, Axis8);
            var prev_grid = selected_grid;
            for(let m = 0; m < neighors.length; m++) {
                var neighor_index = this.convertMapPosToIndex(mapSize, neighors[m]);
                var neighor_grid = map[neighor_index];

                /** 排除地形 */
                if (neighor_grid.flag == EnumFlagType.Terrain) {
                    continue;
                }

                /** 排除两侧地形 */
                var dx = neighor_grid.x - selected_grid.x;
                var dy = neighor_grid.y - selected_grid.y;
                if (dx != 0 && dy != 0) {
                    var side0 = {x: neighor_grid.x, y: selected_grid.y};
                    var side1 = {x: selected_grid.x, y: neighor_grid.y};
                    var side0_index = this.convertMapPosToIndex(mapSize, side0);
                    var side1_index = this.convertMapPosToIndex(mapSize, side1);
                    var side0_grid = map[side0_index];
                    var side1_grid = map[side1_index];
                    if (side0_grid.flag == EnumFlagType.Terrain || side1_grid.flag == EnumFlagType.Terrain) {
                        continue;
                    }
                }

                if (neighor_grid.cost < prev_grid.cost) {
                    prev_grid = neighor_grid;
                }
            }

            if (prev_grid != selected_grid) {
                selected_grid.prev = prev_grid;
            }
        }
    }

    /**
     * 标记关键点
     */
    static createKeypoints(mapSize: cc.Size, map: IGrid[]) {
        MiscUtils.timeRecordStart('createKeypoints');
        for(let i = 0; i < map.length; i++) {
            let blocks: IGrid[] = [];
            let selected_grid = map[i];
            var existIsolate = false;

            if (selected_grid.flag == EnumFlagType.Path) {
                let neighors = this.getNeighors(mapSize, selected_grid, Axis8);
                let last_neighor = neighors[neighors.length-1];
                let last_neighor_index = this.convertMapPosToIndex(mapSize, last_neighor);
                let last_neighor_grid = map[last_neighor_index];
                let nearCount = last_neighor_grid.flag == EnumFlagType.Terrain? 1: 0;
                for(let j = 0; j < neighors.length; j++) {
                    let neighor_index = this.convertMapPosToIndex(mapSize, neighors[j]);
                    let neighor_grid = map[neighor_index];
                    if (neighor_grid.flag == EnumFlagType.Terrain) {
                        blocks.push(neighor_grid);
                        nearCount++;
                    } else {
                        let dx = Math.abs(neighor_grid.x - selected_grid.x);
                        let dy = Math.abs(neighor_grid.y - selected_grid.y);
                        if (nearCount == 1 && (dx + dy) == 1) {
                            existIsolate = true;
                        }
                        nearCount = 0;
                    }
                }
            }
            
            selected_grid.isKeypoint = existIsolate;
        }
        MiscUtils.timeRecordEnd('createKeypoints');
    }

    /** 生成阻挡线段 */
    static createSegments(mapSize: cc.Size, map: IGrid[]) {
        MiscUtils.timeRecordStart('createSegments');
        let segments = [];
        let tmpMapPos = {x: 0, y: 0};

        /** 横向 */
        for(let j = 0; j < mapSize.height; j++) {
            for(let i = 0; i < mapSize.width; i++) {
                tmpMapPos.x = i;
                tmpMapPos.y = j;
                let seleted_map_index = this.convertMapPosToIndex(mapSize, tmpMapPos);
                let selected_grid = map[seleted_map_index];
                selected_grid.tmpUsed = false;
                
                if (selected_grid.flag == EnumFlagType.Terrain) {
                    let start_pos = selected_grid;
                    let end_pos = selected_grid;
                    for(let step = i+1; step < mapSize.width; step++, i++) {
                        tmpMapPos.x = step;
                        tmpMapPos.y = j;
                        let step_map_index = this.convertMapPosToIndex(mapSize, tmpMapPos);
                        let step_grid = map[step_map_index];
                        if (step_grid.flag == EnumFlagType.Terrain) {
                            selected_grid.tmpUsed = true;
                            step_grid.tmpUsed = true;
                            end_pos = step_grid;
                        } else {
                            break;
                        }
                    }

                    if (start_pos != end_pos) {
                        segments.push({
                            points: [start_pos, end_pos],
                            orient: EnumOrientation.Horizontal,
                        });
                    }
                }
            }
        }

        /** 纵向 */
        for(let i = 0; i < mapSize.width; i++) {
            for(let j = 0; j < mapSize.height; j++) {
                tmpMapPos.x = i;
                tmpMapPos.y = j;
                let seleted_map_index = this.convertMapPosToIndex(mapSize, tmpMapPos);
                let selected_grid = map[seleted_map_index];
                
                if (!selected_grid.tmpUsed && selected_grid.flag == EnumFlagType.Terrain) {
                    let start_pos = selected_grid;
                    let end_pos = selected_grid;
                    for(let step = j+1; step < mapSize.height; step++, j++) {
                        tmpMapPos.y = step;
                        tmpMapPos.x = i;
                        let step_map_index = this.convertMapPosToIndex(mapSize, tmpMapPos);
                        let step_grid = map[step_map_index];
                        if (step_grid.flag == EnumFlagType.Terrain && !step_grid.tmpUsed) {
                            selected_grid.tmpUsed = true;
                            step_grid.tmpUsed = true;
                            end_pos = step_grid;
                        } else {
                            break;
                        }
                    }

                    if (start_pos != end_pos) {
                        segments.push({
                            points: [start_pos, end_pos],
                            orient: EnumOrientation.Vertical,
                        });
                    }
                }
            }
        }
        
        MiscUtils.timeRecordEnd('createSegments');
        return segments;
    }
}
