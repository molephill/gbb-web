import type { SubMenuConfig, ParsedData, CellValue } from '../types';
import { ParserBase } from './parser-base';

/**
 * 解析器12 - 另一种包含模式
 */
export class Parse12 extends ParserBase {
  parse(titles: SubMenuConfig[]): ParsedData {
    const out: ParsedData = [];

    for (const draw of this.allData) {
      const result = draw.results;
      const subOut: CellValue[][][] = [];
      out.push(subOut);

      for (let j = 0; j < titles.length; j++) {
        const title = titles[j];

        if (j === 0) {
          subOut.push([this.createBaseRow(draw)]);
        } else {
          const child: CellValue[] = [];
          subOut.push([child]);

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
              this.rootMenu?.name || '',
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

export function parse12(titles: SubMenuConfig[]): ParsedData {
  const parser = new Parse12();
  return parser.parse(titles);
}
