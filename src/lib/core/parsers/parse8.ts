import type { SubMenuConfig, ParsedData, CellValue } from '../types';
import { ParserBase } from './parser-base';

/**
 * 解析器8 - 豹子/二连
 */
export class Parse8 extends ParserBase {
  parse(titles: SubMenuConfig[], menuId: number = 8): ParsedData {
    this.currentMenuId = menuId;

    const out: ParsedData = [];
    const twoMoreMap = new Map<number, boolean>();
    const twoMap = new Map<number, boolean>();
    const regex = /0/g;

    // 第一次遍历：计算豹子和二连
    for (let i = 0; i < this.allData.length; i++) {
      const draw = this.allData[i];
      const result = draw.results;
      const subOut: CellValue[][][] = [];
      out.push(subOut);

      for (let j = 0; j < titles.length; j += 2) {
        if (j === 0) {
          subOut.push([this.createBaseRow(draw)]);
        } else {
          const child: CellValue[] = [];
          subOut[j] = [child];

          let finalHas = false;

          if (j === 2) {
            // 豹子
            const matchInfo = titles[j].rows[1];
            for (let k = 0; k < matchInfo.length; k++) {
              const matchStr = matchInfo[k] as string;
              const positions: number[] = [];
              let match: RegExpExecArray | null;

              while ((match = regex.exec(matchStr)) !== null) {
                positions.push(match.index);
              }

              let show = false;
              if (positions.length >= 2) {
                show = !!(
                  result[positions[0]] && result[positions[0]] === result[positions[1]]
                );
                if (show) finalHas = true;
              }

              this.setShowValue(
                show,
                child,
                k,
                titles[j],
                draw,
                this.getRowName(titles[j]),
                this.getColName(titles[j], k)
              );
            }
            if (finalHas) twoMoreMap.set(i, true);
          } else if (j === 4) {
            // 二连
            const matchMap = new Map<string, number>();
            for (let k = 0; k < result.length; k++) {
              const char = result[k];
              const has = matchMap.get(char) || 0;
              matchMap.set(char, has + 1);
            }

            for (let k = 0; k < 10; k++) {
              const show = (matchMap.get(`${k}`) || 0) >= 2;
              if (show) finalHas = true;

              this.setShowValue(
                show,
                child,
                k,
                titles[j],
                draw,
                this.getRowName(titles[j]),
                this.getColName(titles[j], k)
              );
            }
            if (finalHas) twoMap.set(i, true);
          }
        }
      }
    }

    // 第二次遍历：填充统计行
    for (let i = 0; i < this.allData.length; i++) {
      const subOut = out[i];
      const draw = this.allData[i];

      for (let j = 1; j < titles.length; j += 2) {
        const child: CellValue[] = [];
        subOut[j] = [child];

        let show = false;

        if (j === 1) {
          if (twoMoreMap.get(i)) show = true;
        } else if (j === 3) {
          if (twoMap.get(i)) show = true;
        }

        this.setShowValue(
          show,
          child,
          0,
          titles[j],
          draw,
          this.getRowName(titles[j]),
          '统计'
        );
      }
    }

    return out;
  }
}

export function parse8(titles: SubMenuConfig[], menuId: number = 8, menuName: string = ''): ParsedData {
  const parser = new Parse8();
  parser.setMenuName(menuName);
  return parser.parse(titles, menuId);
}
