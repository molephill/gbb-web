import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Git 同步工具
 */
const GITEE_URL = 'https://gitee.com/liar7254/gold-bling-bling-data.git';
const EXTENDS_PATH = path.join(process.cwd(), '../extends');

/**
 * 初始化 Git
 */
function getGit(): SimpleGit {
  return simpleGit(EXTENDS_PATH);
}

/**
 * 从 Gitee 拉取数据
 */
export async function gitPullFromGitee(): Promise<void> {
  const git = getGit();

  // 检查目录是否存在
  if (!fs.existsSync(EXTENDS_PATH)) {
    await simpleGit().clone(GITEE_URL, EXTENDS_PATH);
  } else {
    await git.pull('origin', 'main');
  }
}

/**
 * 推送到 Gitee
 */
export async function gitPush(message: string): Promise<void> {
  const git = getGit();

  await git.add('.');
  await git.commit(message);
  await git.push('origin', 'main');
}

/**
 * 同步更新（拉取最新数据）
 */
export async function gitSync(): Promise<void> {
  await gitPullFromGitee();
}
