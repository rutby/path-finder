namespace BehaviorTree {
    export enum EnumNodeType {
        SELECTOR,
        CONDITION,
        ACTION,
        SEQUENCE,
    }

    export interface INode {
        type: string,
        nType?: EnumNodeType,
        name: string,
        funcName?: string,
        funcParams?: string[],
        nodes: INode[],
    }

    export class Parser {
        /** 创建节点 */
        static newNode(type: string, name: string, funcName?: string, funcParams?: string[]): INode {
            return {
                type: type,
                name: name,
                funcName: funcName,
                funcParams: funcParams,
                nodes: [],
            };
        }
    
        /** 解析逻辑文本树 */
        static run(dataSource: string): INode {
            let lines = dataSource.split('\n');
            let reg1 = /^\s*\*\s*([^-]*)\s+-\s*(\w*)/;
            let reg2 = /^\s*\*\s*([^-]*)\s+-\s*(\w*)\s*-\s*([^$]*)/;
            let root = null;
            let parent = null;
            let stack = [];
            for(let line of lines) {
                let tab_index = line.indexOf('*');
                /** 不以*开头的文本不是有效输入项 */
                if (tab_index == -1) {
                    continue;
                }
    
                let match_result = line.match(reg1);
                let name = match_result[1];
                let type = match_result[2];
                if (!name) {
                    console.warn("can't match name", line)
                    continue;
                }
                if (!type) {
                    console.warn("can't match type", line)
                    continue;
                }
    
                let node = null;
                switch(type) {
                    case 'sequence':
                    case 'selector': 
                    {
                        node = this.newNode(type, name);
                        break;
                    }
                    case 'condition': 
                    case 'action':
                        let match_result_act = line.match(reg2);
                        let act = match_result_act[3];
                        let arr = act.split(' ');
                        node = this.newNode(type, name, arr[0], arr.slice(1));
                        break;
                    default: 
                        console.warn("unsupport type", line)
                        break;
                }
    
                let level = Math.floor(tab_index / 4);
                node.level = level;
                if (!root) {
                    root = node;
                    parent = node;
                } else {
                    while(level <= parent.level) {
                        parent = stack.pop();
                    }
                    parent.nodes.push(node);
                    stack.push(parent);
                    parent = node;
                }
            }
    
            return root
        }
    }    

    export class Runner {
        private _conditionSource: any = null;
        private _actionSource: any = null;
        private _root: INode = null;
        private _entity: any = null;

        /** 指定可配参数 */
        constructor(root: INode, conditionSource: any, actionSource: any, entity: any) {
            this._root = root;
            this._conditionSource = conditionSource;
            this._actionSource = actionSource;
            this._entity = entity;

            /** 预处理 */
            this.visitNode(this._root, (node: INode) => {
                node.nType = EnumNodeType[node.type.toUpperCase()];
            });
        }

        visitNode(node: INode, func: Function) {
            func(node);
            for(let child of node.nodes) {
                this.visitNode(child, func);
            }
        }

        /** 执行一次 */
        run() {
            this.processNode(this._root);
        }

        processNode(node: INode): boolean {
            if (node.nType != EnumNodeType.ACTION) {
                console.log('[develop] ========', node.name);
            }
            let result = false;
            switch(node.nType) {
                case EnumNodeType.SELECTOR:
                {
                    for(let child of node.nodes) {
                        if (this.processNode(child)) {
                            result = true;
                            break;
                        }
                    }
                    break;
                }
                case EnumNodeType.SEQUENCE:
                {
                    result = true;
                    for(let child of node.nodes) {
                        if (!this.processNode(child)) {
                            result = false;
                            break;
                        }
                    }
                    break;
                }
                case EnumNodeType.CONDITION:
                {
                    let conditionFunc = this._conditionSource[node.funcName];
                    if (!conditionFunc || typeof(conditionFunc) != 'function') {
                        console.warn('unsupport type', node);
                        break;
                    }

                    result = conditionFunc.call(this._conditionSource, this._entity, ...node.funcParams);
                    break;
                }
                case EnumNodeType.ACTION:
                {
                    let actionFunc = this._actionSource[node.funcName];
                    if (!actionFunc || typeof(actionFunc) != 'function') {
                        console.warn('unsupport type', node);
                        break;
                    }

                    actionFunc.call(this._actionSource, this._entity, ...node.funcParams);
                    result = true;
                    break;
                }
                default:
                    console.warn('unsupport type', node);
                    break;
            }

            if (node.nType == EnumNodeType.ACTION) {
                console.log('[develop] ========', node.name, result);
            }
            return result;
        }
    }
}

namespace Game {
    export enum EnumStateType {
        ATTACK,
        MOVE,
        IDLE,
    }

    export enum EnumAttackState {
        Ongoing,
        Idle,
    }

    export interface IEntity {
        /** 当前状态 */
        state: EnumStateType,
        /** 攻击距离内是否存在目标 - 简单实现 */
        existEnemy: boolean,
        /** 当前距离 - 简单实现 */
        dis: number,
        /** 攻击状态 - 简单实现 */
        attackState: EnumAttackState,
        /** 已攻击 - 简单实现 */
        attacked: boolean,
    }

    export class BTCondition {
        /** 攻击距离内是否存在目标 - 简单实现 */
        static existEnemyInAttackRadius(ent: IEntity): boolean {
            return ent.existEnemy;
        }

        /** 未抵达终点 - 简单实现 */
        static isNotArriveDstPos(ent: IEntity): boolean {
            return ent.dis < 10;
        }

        /** 未攻击 - 简单实现 */
        static isNotAttackStart(ent: IEntity): boolean {
            return ent.attackState == EnumAttackState.Idle && !ent.attacked;
        }

        /** 攻击已结束 - 简单实现 */
        static isAttackEnded(ent: IEntity): boolean {
            return ent.attackState == EnumAttackState.Idle && ent.attacked;
        }

        /** 是否为指定状态 */
        static isState(ent: IEntity, state: string): boolean {
            state = state.toUpperCase();
            return ent.state == EnumStateType[state];
        }
    }

    export class BTAction {
        /** 设置单位状态 - 简单实现 */
        static changeState(ent: IEntity, state: string) {
            state = state.toUpperCase();
            ent.state = EnumStateType[state];
            
            switch(ent.state) {
                case EnumStateType.IDLE: 
                {
                    ent.attacked = false;
                    break;
                }
            }
        }

        /** 触发攻击 - 简单实现 */
        static triggerAttack(ent: IEntity, ...args) {
            ent.attackState = EnumAttackState.Ongoing;
        }
    }
}

let dataSource = `
* 状态检测 - selector
    * 待机状态检测 - sequence
        * 是否是待机状态? - condition - isState Idle
        * 待机状态下策略选择 - selector
            * 能不能攻击? - sequence    
                * 攻击范围内有目标? - condition - existEnemyInAttackRadius
                * 状态 = 攻击 - action - changeState Attack
            * 能不能移动? - sequence
                * 没有移动到终点? - condition - isNotArriveDstPos
                * 状态 = 移动 - action - changeState Move
    * 攻击状态检测 - sequence
        * 是否是攻击状态? - condition - isState Attack
        * 待机状态下策略选择 - selector
            * 攻击开始了吗? - sequence
                * 攻击未开始? - condition - isNotAttackStart
                * 发起攻击 - action - triggerAttack
            * 攻击结束了吗? - sequence
                * 攻击动作已结束? - condition - isAttackEnded
                * 状态 = 待机 - action - changeState Idle`;

let tree = BehaviorTree.Parser.run(dataSource);
let entity = {
    state: Game.EnumStateType.IDLE,
    existEnemy: true,
    dis: 0,
    attackState: Game.EnumAttackState.Idle,
    attacked: false,
}
let runner = new BehaviorTree.Runner(tree, Game.BTCondition, Game.BTAction, entity);
for(var i = 0; i < 5; i++) {
    console.log('[develop] ========', 'loop', i);
    if (i == 3) {
        entity.attacked = true;
        entity.attackState = Game.EnumAttackState.Idle;
        entity.existEnemy = Math.random() < 0.5;
    }
    runner.run();
}
