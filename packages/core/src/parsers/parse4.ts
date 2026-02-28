import type { SubMenuConfig, ParsedData, CellValue } from '../types';
import { ParserBase } from './parser-base';

/**
 * 解析器4 - 排序模式
 */
export class Parse4 extends ParserBase {
  parse(titles: SubMenuConfig[], menuId: number = 4): ParsedData {
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

          if (titleId < 5) {
            const matchResult = title.rows[0][0] as string;

            for (let k = 0; k < title.rows[1].length; k++) {
              const matchIndices = title.rows[1][k] as string;
              let show = false;

              if (titleId === 2 || titleId === 3) {
                // 检查结果是否包含指定字符
                let matchCount = 0;
                for (let f = 0; f < result.length; f++) {
                  if (matchIndices.indexOf(result[f]) !== -1) {
                    matchCount++;
                  }
                }
                show = matchCount >= result.length;
              } else {
                let matchCount = 0;
                for (let f = 0; f < matchIndices.length; f++) {
                  const matchIndex = Number(matchIndices[f]);
                  const resultNum = result[matchIndex - 1];
                  if (matchResult.indexOf(resultNum) !== -1) {
                    matchCount++;
                    if (matchCount >= matchIndices.length) {
                      show = true;
                      break;
                    }
                  }
                }
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
          } else {
            // 过滤模式
            const filterStr = title.rows[0][0] as string;

            for (let k = 0; k < result.length; k++) {
              const char = result[k];
              const show = filterStr.indexOf(char) !== -1;
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
    }

    return out;
  }
}

export function parse4(titles: SubMenuConfig[], menuId: number = 4, menuName: string = ''): ParsedData {
  const parser = new Parse4();
  parser.setMenuName(menuName);
  return parser.parse(titles, menuId);
}
