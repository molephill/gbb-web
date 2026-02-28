import type { SubMenuConfig, ParsedData, CellValue } from '../types';
import { ParserBase } from './parser-base';

/**
 * 解析器5 - 大小组合
 */
export class Parse5 extends ParserBase {
  parse(titles: SubMenuConfig[], menuId: number = 5): ParsedData {
    this.currentMenuId = menuId;

    const out: ParsedData = [];

    for (const draw of this.allData) {
      const result = draw.results;
      const subOut: CellValue[][][] = [];
      out.push(subOut);

      for (let j = 0; j < titles.length; j++) {
        if (j === 0) {
          subOut.push([this.createBaseRow(draw)]);
        } else {
          const child: CellValue[] = [];
          subOut.push([child]);

          const title = titles[j];
          const titleId = title.id || 0;

          for (let k = 0; k < title.rows[1].length; k++) {
            let show = false;
            const matchStr = title.rows[1][k] as string;

            if (titleId === 1) {
              show = Number(result[k]) < 5;
            } else if (titleId === 2) {
              show = Number(result[k]) > 4;
            } else {
              // 组合模式
              const fl = (title.rows[0][0] as string).length;
              let matchCount = 0;

              for (let f = 0; f < fl; f++) {
                const resultIndex = Number((title.rows[0][0] as string)[f]);
                const resultValue = Number(result[resultIndex - 1]);
                if (matchStr[f] === '大') {
                  if (resultValue > 4) matchCount++;
                } else {
                  if (resultValue <= 4) matchCount++;
                }
              }
              show = matchCount >= fl;
            }

            this.setShowValue(
              show,
              child,
              k,
              title,
              draw,
              this.getRowName(title),
              this.getColName(title, k)
            );
          }
        }
      }
    }

    return out;
  }
}

export function parse5(titles: SubMenuConfig[], menuId: number = 5, menuName: string = ''): ParsedData {
  const parser = new Parse5();
  parser.setMenuName(menuName);
  return parser.parse(titles, menuId);
}
