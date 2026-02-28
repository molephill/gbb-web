import type { SubMenuConfig, ParsedData, CellValue } from '../types';
import { ParserBase } from './parser-base';

/**
 * 解析器9 - 质合/邻隔
 */
export class Parse9 extends ParserBase {
  parse(titles: SubMenuConfig[], menuId: number = 9): ParsedData {
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
          const minMaxArr = (title.rows[0][0] as string).split('-');
          const min = Number(minMaxArr[0]);
          const max = Number(minMaxArr[1]);

          if (max > min) {
            // 范围模式
            let first = 1;
            let second = first;

            for (let k = 0; k < title.rows[1].length; k++) {
              if (k < title.rows[1].length - 1) {
                second++;
                const charF = Number(result[first - 1]);
                const charS = Number(result[second - 1]);
                const show = charF >= min && charF <= max && charS >= min && charS <= max;

                this.setShowValue(
                  show,
                  child,
                  k,
                  title,
                  draw,
                  this.getRowName(title),
                  this.getColName(title, k)
                );

                if (second >= 4) {
                  first++;
                  second = first;
                }
              } else {
                let matchCount = 0;
                for (let f = 0; f < result.length; f++) {
                  const char = Number(result[f]);
                  if (char >= min && char <= max) {
                    matchCount++;
                  } else {
                    break;
                  }
                }
                const show = matchCount >= result.length;
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
          } else {
            // 循环模式
            const matchRules: number[] = [];
            let cur = min;

            while (cur !== max) {
              matchRules.push(cur);
              cur++;
              if (cur > 9) cur = 0;
            }
            matchRules.push(max);

            let first = 1;
            let second = first;

            for (let k = 0; k < title.rows[1].length; k++) {
              if (k < title.rows[1].length - 1) {
                second++;
                const charF = Number(result[first - 1]);
                const charS = Number(result[second - 1]);
                const show = matchRules.includes(charF) && matchRules.includes(charS);

                this.setShowValue(
                  show,
                  child,
                  k,
                  title,
                  draw,
                  this.getRowName(title),
                  this.getColName(title, k)
                );

                if (second >= 4) {
                  first++;
                  second = first;
                }
              } else {
                let matchCount = 0;
                for (let f = 0; f < result.length; f++) {
                  const char = Number(result[f]);
                  if (matchRules.includes(char)) {
                    matchCount++;
                  } else {
                    break;
                  }
                }
                const show = matchCount >= result.length;
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

export function parse9(titles: SubMenuConfig[], menuId: number = 9, menuName: string = ''): ParsedData {
  const parser = new Parse9();
  parser.setMenuName(menuName);
  return parser.parse(titles, menuId);
}
