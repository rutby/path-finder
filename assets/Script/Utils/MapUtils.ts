import { Config, EnumFlagType, IGrid, IPos } from "../Const/Config";
import { MiscUtils } from "./MiscUtils";

var Axis4 = [
    cc.v2(0, 1),
    cc.v2(0, -1),
    cc.v2(-1, 0),
    cc.v2(1, 0),
]

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
     * dijkstra算法生成热力图 
     * 数据统计: 
     *      * 50x50 数组 11ms
     */
    static createHeatMap(mapSize: cc.Size, map: IGrid[], target_pos: cc.Vec2) {
        // MiscUtils.timeRecordStart('createHeatMap');

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
            var neighors = this.getNeighors(mapSize, selected_grid);
            for(var i = 0; i < neighors.length; i++) {
                var neighor = neighors
                var neighor_index = this.convertMapPosToIndex(mapSize, neighor[i]);
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

        // MiscUtils.timeRecordEnd('createHeatMap', 'end', true);
    }

    static getNeighors(mapSize: cc.Size, posGrid: IPos): IPos[] {
        var arr = [];
        for(var i = 0; i < Axis4.length; i++) {
            var dir = Axis4[i];
            var dst = {x: posGrid.x - dir.x, y: posGrid.y - dir.y};
            if (dst.x >= 0 && dst.x < mapSize.width && dst.y >= 0 && dst.y < mapSize.height) {
                arr.push(dst);
            }
        }
        return arr;
    }
}