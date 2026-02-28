import type { SubMenuConfig, ParsedData, CellValue } from '../types';
import { ParserBase } from './parser-base';

/**
 * 解析器2 - 9/27组一条龙
 * 解析特定组合是否全部出现
 */
export class Parse2 extends ParserBase {
  parse(titles: SubMenuConfig[], menuId: number = 2): ParsedData {
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

          if (title.id === 4) {
            // 特殊模式：147/258/369 匹配
            const matchs = ['147', '258', '369'];

            for (let k = 0; k < title.rows[1].length; k++) {
              const matchIndices = title.rows[1][k] as string;
              let show = false;
              const fl = matchIndices.length;
              let matchCount = 0;
              let firstMatch = -1;

              for (let f = 0; f < fl; f++) {
                const index = Number(matchIndices[f]);
                const resultIndex = result[index - 1];

                if (firstMatch < 0) {
                  firstMatch = 0;
                  for (let t = 0; t < matchs.length; t++) {
                    const matchResult = matchs[t];
                    if (matchResult.indexOf(resultIndex) !== -1) {
                      firstMatch |= 1 << t;
                    }
                  }
                  if (firstMatch > 0) {
                    matchCount++;
                  } else {
                    break;
                  }
                } else {
                  for (let t = 0; t < matchs.length; t++) {
                    const matchResult = matchs[t];
                    if ((firstMatch & (1 << t)) && matchResult.indexOf(resultIndex) !== -1) {
                      matchCount++;
                      break;
                    }
                  }
                }
              }
              show = matchCount >= fl;
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
            // 普通模式：匹配指定数字
            const matchResult = title.rows[0][0] as string;

            for (let k = 0; k < title.rows[1].length; k++) {
              if (k < (title.rows[1].length - 1)) {
                const matchIndices = title.rows[1][k] as string;
                let show = false;
                const fl = matchIndices.length;
                let matchCount = 0;

                for (let f = 0; f < fl; f++) {
                  const index = Number(matchIndices[f]);
                  const resultIndex = result[index - 1];
                  if (matchResult.indexOf(resultIndex) !== -1) {
                    matchCount++;
                  } else {
                    break;
                  }
                }
                show = matchCount >= fl;
                this.setShowValue(
                  show,
                  child,
                  k,
                  title,
                  draw,
                  this.getRowName(title),
                  this.getColName(title, k)
                );
              } else {
                // 最后一列：检查所有位
                let show = false;
                const fl = result.length;
                let matchCount = 0;

                for (let f = 0; f < fl; f++) {
                  const resultIndex = result[f];
                  if (matchResult.indexOf(resultIndex) !== -1) {
                    matchCount++;
                  } else {
                    break;
                  }
                }
                show = matchCount >= fl;
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
    }

    return out;
  }
}

/**
 * 创建解析器实例并解析
 */
export function parse2(titles: SubMenuConfig[], menuId: number = 2, menuName: string = ''): ParsedData {
  const parser = new Parse2();
  parser.setMenuName(menuName);
  return parser.parse(titles, menuId);
}
