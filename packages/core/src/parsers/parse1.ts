import type { SubMenuConfig, ParsedData, CellValue } from '../types';
import { ParserBase } from './parser-base';

/**
 * 解析器1 - 趋势图/大小/单双
 * 解析每一位的数字、大小、单双
 */
export class Parse1 extends ParserBase {
  parse(titles: SubMenuConfig[], menuId: number = 1): ParsedData {
    // 设置当前菜单 ID
    this.currentMenuId = menuId;

    // 设置根菜单（使用第一个有名称的 title）
    for (const title of titles) {
      if (title.rows[0] && title.rows[0][0]) {
        this.setRootMenu(title);
        break;
      }
    }

    const out: ParsedData = [];

    for (const draw of this.allData) {
      const result = draw.results;
      const subOut: CellValue[][][] = [];
      out.push(subOut);

      for (let j = 0; j < titles.length; j++) {
        const title = titles[j];

        if (j === 0) {
          // 第一行：日期、期号、开奖号码
          subOut.push([this.createBaseRow(draw)]);
        } else if (j < 5) {
          // 第2-4行：每一位的数字 (0-9)
          const child: CellValue[] = [];
          subOut.push([child]);
          const char = result[j - 1];

          for (let k = 0; k < 10; k++) {
            const show = char === `${k}`;
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
          // 第5-8行：小位、大位、单、双
          const child: CellValue[] = [];
          subOut.push([child]);

          for (let k = 0; k < result.length; k++) {
            let show = false;

            if (j === 5) {
              // 小位: <= 4
              show = Number(result[k]) <= 4;
            } else if (j === 6) {
              // 大位: > 4
              show = Number(result[k]) > 4;
            } else if (j === 7) {
              // 单
              show = Number(result[k]) % 2 !== 0;
            } else if (j === 8) {
              // 双
              show = Number(result[k]) % 2 === 0;
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

/**
 * 创建解析器实例并解析
 */
export function parse1(titles: SubMenuConfig[], menuId: number = 1, menuName: string = ''): ParsedData {
  const parser = new Parse1();
  parser.setMenuName(menuName);
  return parser.parse(titles, menuId);
}
