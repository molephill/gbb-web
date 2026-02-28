import type { SubMenuConfig, ParsedData, CellValue } from '../types';
import { ParserBase } from './parser-base';

/**
 * 解析器3 - 三区比/三路比
 */
export class Parse3 extends ParserBase {
  parse(titles: SubMenuConfig[], menuId: number = 3): ParsedData {
    this.currentMenuId = menuId;

    const out: ParsedData = [];

    for (const draw of this.allData) {
      const result = draw.results;
      const subOut: CellValue[][][] = [];
      out.push(subOut);

      const matchRules = new Map<number, string[][]>();

      for (let j = 0; j < titles.length; j++) {
        if (j === 0) {
          subOut.push([this.createBaseRow(draw)]);
        } else {
          const child: CellValue[] = [];
          subOut.push([child]);

          const title = titles[j];

          if (title.id && title.id > 5) {
            matchRules.clear();
            matchRules.set(6, [['0147', '0147'], ['0258', '0258'], ['0369', '0369']]);
            matchRules.set(7, [['147', '258369'], ['258', '147369'], ['369', '147258']]);

            const titleId = title.id;
            const rules = title.rows[1];

            for (let k = 0; k < rules.length; k++) {
              let show = false;
              const rule = rules[k] as string;
              const subMatchRules = matchRules.get(titleId);

              if (subMatchRules) {
                for (const subMatch of subMatchRules) {
                  let matchCount = 0;
                  for (let q = 0; q < subMatch.length; q++) {
                    const resultIndex = Number(rule[q]);
                    const resultValue = result[resultIndex - 1];
                    if (subMatch[q].indexOf(resultValue) !== -1) {
                      matchCount++;
                      if (matchCount >= subMatch.length) {
                        show = true;
                        break;
                      }
                    }
                  }
                  if (show) break;
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
            // 普通模式
            const matchResult = title.rows[0][0] as string;

            for (let k = 0; k < title.rows[1].length; k++) {
              if (k < title.rows[1].length - 1) {
                const matchIndices = title.rows[1][k] as string;
                let show = false;
                let matchCount = 0;

                for (let f = 0; f < matchIndices.length; f++) {
                  const index = Number(matchIndices[f]);
                  const resultIndex = result[index - 1];
                  if (matchResult.indexOf(resultIndex) !== -1) {
                    matchCount++;
                  } else {
                    break;
                  }
                }
                show = matchCount >= matchIndices.length;
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
                let show = false;
                let matchCount = 0;

                for (let f = 0; f < result.length; f++) {
                  const resultIndex = result[f];
                  if (matchResult.indexOf(resultIndex) !== -1) {
                    matchCount++;
                  } else {
                    break;
                  }
                }
                show = matchCount >= result.length;
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

export function parse3(titles: SubMenuConfig[], menuId: number = 3, menuName: string = ''): ParsedData {
  const parser = new Parse3();
  parser.setMenuName(menuName);
  return parser.parse(titles, menuId);
}
