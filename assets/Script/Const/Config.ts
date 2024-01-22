
export class Config {
    //====================== Game
    static DesignResolution: cc.Size = cc.size(1136, 640);

    //====================== Map
    static GridSize: cc.Size = cc.size(32, 32);
    static MaxUnitCount: number = 30;
    static EnableOptimize: boolean = true;
}

export class Events {
    static Debug_Switch_Profiler: string = 'Debug_Switch_Profiler';
    static Debug_Switch_Units: string = 'Debug_Switch_Units';
    static Debug_Switch_VectorMap: string = 'Debug_Switch_VectorMap';
    static Debug_Switch_KeyPoint: string = 'Debug_Switch_keyPoint';
    static Debug_Switch_Index: string = 'Debug_Switch_Index';
    static Debug_Switch_Optmize: string = 'Debug_Switch_Optmize';
    static Debug_Switch_Help: string = 'Debug_Switch_Help';
}