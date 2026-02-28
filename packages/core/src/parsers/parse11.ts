import type { SubMenuConfig, ParsedData, CellValue } from '../types';
import { ParserBase } from './parser-base';

/**
 * 解析器11 - 特殊三区比
 */
export class Parse11 extends ParserBase {
  parse(titles: SubMenuConfig[], menuId: number = 1): ParsedData {
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
          const matchRules = new Map<number, string[][]>();

          matchRules.set(1, [
            ['0147', '0147'],
            ['0258', '0258'],
            ['0369', '0369'],
          ]);

          matchRules.set(2, [
            ['147', '258369'],
            ['258', '147369'],
            ['369', '147258'],
          ]);

          const titleId = title.id || 0;
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
        }
      }
    }

    return out;
  }
}

export function parse11(titles: SubMenuConfig[]): ParsedData {
  const parser = new Parse11();
  return parser.parse(titles);
}
