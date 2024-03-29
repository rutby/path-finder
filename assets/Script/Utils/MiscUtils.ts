export class MiscUtils {
    private static _recordStartTs: any = {};
    static timeRecordStart(tag: string) {
        this._recordStartTs[tag] = new Date().getTime();
    }

    static timeRecordEnd(tag: string, clear?: boolean) {
        if (!this._recordStartTs[tag]) {
            console.warn("use timeRecordStart before", tag);
            return;
        }

        var last = this._recordStartTs[tag];
        var curr = new Date().getTime();
        if (clear) {
            delete this._recordStartTs[tag];
        }
        console.log('[develop] ========', '[TimeRecord]', tag, curr - last);
    }

    static randomRangeInt(min: number, max: number) {
        var num = (Math.random() * (max - min)) + min;
        return Math.round(num);
    }

    static vec2deg(vec: cc.Vec2) {
        var degree = cc.misc.radiansToDegrees(cc.v2(vec).signAngle(cc.v2(1, 0)));
        return degree <= 0? -degree : 360 - degree;
    }

    private static _r0: any = {x: 0, y: 0};
    private static _r1: any = {x: 0, y: 0};
    private static _r2: any = {x: 0, y: 0};
    private static _r3: any = {x: 0, y: 0};
    /** 线段与矩形是否相交 */
    static intersectionLineRect(a1, a2, b): boolean {
        this._r0.x = b.x;
        this._r0.y = b.y;
        this._r1.x = b.x;
        this._r1.y = b.yMax;
        this._r2.x = b.xMax;
        this._r2.y = b.yMax;
        this._r3.x = b.xMax;
        this._r3.y = b.y;
    
        if ( this.intersectionLineLine( a1, a2, this._r0, this._r1 ) )
            return true;
    
        if ( this.intersectionLineLine( a1, a2, this._r1, this._r2 ) )
            return true;
    
        if ( this.intersectionLineLine( a1, a2, this._r2, this._r3 ) )
            return true;
    
        if ( this.intersectionLineLine( a1, a2, this._r3, this._r0 ) )
            return true;
    
        return false;
    }

    /** 线段与线段是否相交 */
    static intersectionLineLine(a1, a2, b1, b2): boolean {
        var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
        var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
        var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
    
        if ( u_b !== 0 ) {
            /** 除法版本 */
            var ua = ua_t / u_b;
            var ub = ub_t / u_b;

            if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
                return true;
            }
        }
    
        return false;
    }
}
