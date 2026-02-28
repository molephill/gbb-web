import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 获取指定年份的彩票数据
 * 从本地 public/data 目录读取
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  try {
    const { year } = await params;

    // 从本地 public/data 目录读取数据
    const filePath = path.join(process.cwd(), 'public', 'data', `${year}.json`);

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // 始终禁用缓存，确保年份切换时获取最新数据
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    } catch (fileError) {
      // 文件不存在
      return NextResponse.json({ error: `Year ${year} not found` }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
