import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 获取菜单配置
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'menu.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Menu config not found' },
      { status: 404 }
    );
  }
}
