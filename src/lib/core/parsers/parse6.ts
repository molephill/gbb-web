import type { SubMenuConfig, ParsedData, CellValue } from '../types';
import { ParserBase } from './parser-base';

/**
 * 解析器6 - 单双组合
 */
export class Parse6 extends ParserBase {
  parse(titles: SubMenuConfig[], menuId: number = 6): ParsedData {
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

            if (titleId !== 7) {
              let matchCount = 0;
              const matchStr = title.rows[1][k] as string;

              for (let f = 0; f < (title.rows[0][0] as string).length; f++) {
                const resultIndex = Number((title.rows[0][0] as string)[f]);
                const resultValue = Number(result[resultIndex - 1]);
                const isOdd = matchStr[f] !== '双';
                const resultIsOdd = resultValue % 2 !== 0;

                if (resultIsOdd === isOdd) matchCount++;
              }
              show = matchCount >= matchStr.length;
            } else {
              const matchStr = title.rows[1][k] as string;
              const isOdd = matchStr[1] !== '双';
              const resultIndex = Number(matchStr[0]);
              const resultValue = Number(result[resultIndex - 1]);
              const resultIsOdd = resultValue % 2 !== 0;
              show = isOdd === resultIsOdd;
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

export function parse6(titles: SubMenuConfig[], menuId: number = 6, menuName: string = ''): ParsedData {
  const parser = new Parse6();
  parser.setMenuName(menuName);
  return parser.parse(titles, menuId);
}
