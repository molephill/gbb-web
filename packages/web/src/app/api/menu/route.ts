import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import menuConfig from '@gbb/config/menu.json';

/**
 * 获取菜单配置
 * 从本地配置文件读取
 */
export async function GET() {
  try {
    return NextResponse.json(menuConfig);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load menu config' }, { status: 500 });
  }
}
