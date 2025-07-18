import { h } from 'vue';
import MarkdownIt from 'markdown-it';
import { marked } from 'marked';

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

// 配置 markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

/**
 * 使用 markdown-it 渲染 Markdown 内容
 * @param content - Markdown 内容
 * @returns VNode
 */
export function renderMarkdown(content: string) {
  try {
    const html = md.render(content);
    return h('div', {
      innerHTML: html,
      style: {
        lineHeight: '1.6',
        wordBreak: 'break-word',
      },
    });
  } catch (error) {
    console.error('Markdown 渲染失败:', error);
    return h('div', content);
  }
}

/**
 * 使用 marked 渲染 Markdown 内容
 * @param content - Markdown 内容
 * @returns VNode
 */
export function renderMarkdownWithMarked(content: string) {
  try {
    const html = marked(content);
    return h('div', {
      innerHTML: html,
      style: {
        lineHeight: '1.6',
        wordBreak: 'break-word',
      },
    });
  } catch (error) {
    console.error('Marked 渲染失败:', error);
    return h('div', content);
  }
}

/**
 * 解析关联问题
 * @param association - 关联问题字符串
 * @returns 解析后的问题数组
 */
export function parseAssociationQuestions(
  association: string
): Array<{ key: string; description: string }> {
  console.groupCollapsed('Parsing association questions');
  console.log('Original association string:', association);

  if (!association) {
    console.log('Empty association string, returning empty array');
    console.groupEnd();
    return [];
  }

  // 匹配类似 "1. 问题内容" 的格式
  const questionRegex = /\d+\.\s*(.+?)(?=\n\d+\.|\n*$)/g;
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  console.log('Starting regex matching');
  while ((match = questionRegex.exec(association)) !== null) {
    console.log(`Found match at index ${match.index}:`, match[0]);
    matches.push(match);
  }

  const result = matches.map((match, index) => ({
    key: `assoc-${index}`,
    description: match[1]?.trim() || '',
  }));

  console.log('Final parsed association questions:', result);
  console.groupEnd();
  return result;
}

/**
 * 抽离相关问题
 * @param fullContent - 完整内容
 * @returns 主内容和相关问题
 */
export function extractRelatedQuestions(fullContent: string) {
  console.log('【调试】待抽离内容：', fullContent);
  
  // 跨多行匹配
  const match = fullContent.match(/可能还会提问的问题[：:][\s\S]*/);
  if (!match) {
    console.log('【调试】未匹配到相关问题');
    return { main: fullContent, questions: [] };
  }
  
  const before = fullContent.slice(0, match.index).trim();
  const questionsStr = match[0].replace(/^可能还会提问的问题[：:]/, '').trim();
  const questions: string[] = [];
  
  // 匹配 1. xxx 2. xxx 3. xxx
  const regex = /[0-9]+[.、．]\s*(.+)/g;
  let qMatch;
  while ((qMatch = regex.exec(questionsStr))) {
    questions.push(qMatch[1].trim());
  }
  
  console.log('【调试】主内容：', before);
  console.log('【调试】相关问题：', questions);
  return { main: before, questions };
}