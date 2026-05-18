import { ColumnData } from "../../../server/src/types";

export class CoordinateMap {
    private coordMap: Map<string, ColumnData>

    constructor() {
        this.coordMap = new Map();
    }

    private getKey(x: number, z: number): string {
        return JSON.stringify([x, z]);
    }

    private hasCoord(x: number, z: number): boolean {
        return this.coordMap.has(this.getKey(x, z));
    }

    private getColumnData(x: number, z: number): ColumnData {
        if (this.hasCoord(x, z)) {
            return this.coordMap.get(this.getKey(x, z)) as ColumnData;
        } else {
            return { yMap: new Map(), highestY: -1 }
        }
    }

    public getIDAt3DCoord(x: number, y: number, z: number): number {
        if (this.hasCoord(x, z)) {
            const columnData = this.getColumnData(x, z);

            if (columnData.yMap.has(y)) {
                return columnData.yMap.get(y) as number;
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }

    public getIDsAt2DCoord(x: number, z: number): number[] {
        return [...this.getColumnData(x, z).yMap.values()];
    }

    public getHighestY(x: number, z: number): number {
        return this.getColumnData(x, z).highestY;
    }

    // topDown boolean is necessary as this determines the order in which
    // boxes will be moved for an extend/retract move
    // top-down for extend and bottom-up for retract
    public getIDsAtOrAbove(x: number, y: number, z: number, topDown: boolean): number[] {
        if (this.hasCoord(x, z)) {
            const columnData = this.getColumnData(x, z);
            const ids = [];

            for (let i = y; i <= columnData.highestY; i++) {
                if (columnData.yMap.has(i)) {
                    ids.push(columnData.yMap.get(i) as number);
                }
            }

            return topDown ? ids.reverse() : ids;

        } else {
            return []
        }
    }

    public addIDAt(x: number, y: number, z: number, id: number) {
        if (this.hasCoord(x, z)) {
            const columnData = this.getColumnData(x, z);

            columnData.yMap.set(y, id);
            if (y > columnData.highestY) {
                columnData.highestY = y;
            }

        } else {
            this.coordMap.set(this.getKey(x, z), { yMap: new Map([[y, id]]), highestY: y });
        }
    }

    // Returns new highest ID using new highest Y
    public removeIDAt(x: number, y: number, z: number): number {
        if (this.hasCoord(x, z)) {
            const columnData = this.getColumnData(x, z);

            columnData.yMap.delete(y);

            if (columnData.yMap.size === 0) {
                this.coordMap.delete(this.getKey(x, z));
                return 0;
            }

            if (y === columnData.highestY) {
                const newHighestY = columnData.yMap.has(columnData.highestY - 1) ? columnData.highestY - 1 : columnData.highestY - 2;
                columnData.highestY = newHighestY;
            }

            return columnData.yMap.get(columnData.highestY) as number;
        }

        return 0;
    }

    public removeAll(x: number, z: number) {
        this.coordMap.delete(this.getKey(x, z));
    }

    public extendFrom(x: number, y: number, z: number) {
        if (this.hasCoord(x, z)) {
            const columnData = this.getColumnData(x, z);

            for (let i = columnData.highestY; i >= y; i--) {
                if (columnData.yMap.has(i)) {
                    const id = columnData.yMap.get(i) as number;
                    columnData.yMap.set(i+1, id);
                    columnData.yMap.delete(i);
                }
            }

            columnData.highestY++;
        }
    }

    public retractFrom(x: number, y: number, z: number) {
        if (this.hasCoord(x, z)) {
            const columnData = this.getColumnData(x, z);

            for (let i = y; i <= columnData.highestY; i++) {
                if (columnData.yMap.has(i)) {
                    const id = columnData.yMap.get(i) as number;
                    columnData.yMap.set(i-1, id);
                    columnData.yMap.delete(i);
                }
            }

            columnData.highestY--;
        }
    }

    public reset() {
        this.coordMap.clear();
    }
}