/**
 * 文本提取工具
 * 从 Markdown 文本中提取纯文本，清理格式标记，处理特殊字符
 */

export class TextExtractor {
  private sensitivePatterns = [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // 信用卡号
    /\b\d{3}-\d{2}-\d{4}\b/g, // 社会保险号
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // 邮箱
  ];

  /**
   * 从Markdown文本中提取纯文本
   */
  extractPlainText(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    let text = markdown;

    // 移除代码块
    text = text.replace(/```[\s\S]*?```/g, '[代码块]');
    text = text.replace(/`[^`]+`/g, '[代码]');

    // 移除HTML标签
    text = text.replace(/<[^>]*>/g, '');

    // 处理Markdown格式
    text = text.replace(/^#{1,6}\s+/gm, ''); // 标题
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1'); // 粗体
    text = text.replace(/\*([^*]+)\*/g, '$1'); // 斜体
    text = text.replace(/__([^_]+)__/g, '$1'); // 粗体
    text = text.replace(/_([^_]+)_/g, '$1'); // 斜体
    text = text.replace(/~~([^~]+)~~/g, '$1'); // 删除线
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // 链接
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1'); // 图片

    // 处理列表
    text = text.replace(/^[\s]*[-*+]\s+/gm, ''); // 无序列表
    text = text.replace(/^[\s]*\d+\.\s+/gm, ''); // 有序列表

    // 处理引用
    text = text.replace(/^>\s*/gm, '');

    // 处理表格
    text = text.replace(/\|/g, ' ');
    text = text.replace(/^[-\s|:]+$/gm, '');

    // 清理多余的空白字符
    text = text.replace(/\n{3,}/g, '\n\n'); // 多个换行符
    text = text.replace(/[ \t]{2,}/g, ' '); // 多个空格
    text = text.replace(/^\s+|\s+$/gm, ''); // 行首行尾空格

    // 最终清理
    text = text.trim();

    return this.cleanText(text);
  }

  /**
   * 清理文本
   */
  cleanText(text: string): string {
    if (!text) return '';

    // 移除特殊字符但保留基本标点
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // 标准化空白字符
    text = text.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ');
    
    // 移除连续的标点符号
    text = text.replace(/[.]{3,}/g, '...');
    text = text.replace(/[!]{2,}/g, '!');
    text = text.replace(/[?]{2,}/g, '?');
    
    // 清理多余空格
    text = text.replace(/\s+/g, ' ');
    text = text.trim();

    return text;
  }

  /**
   * 验证文本是否有效
   */
  validateText(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const cleanedText = this.cleanText(text);
    
    // 检查文本长度
    if (cleanedText.length === 0 || cleanedText.length > 10000) {
      return false;
    }

    // 检查是否只包含空白字符和标点
    const contentText = cleanedText.replace(/[\s\p{P}]/gu, '');
    if (contentText.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * 过滤敏感信息
   */
  sanitize(text: string): string {
    if (!text) return '';

    let sanitized = text;
    this.sensitivePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '[已隐藏]');
    });

    return sanitized;
  }

  /**
   * 分割长文本
   */
  splitLongText(text: string, maxLength: number = 1000): string[] {
    if (!text || text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?。！？]\s*/);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const sentenceWithPunctuation = trimmedSentence + '。';
      
      if (currentChunk.length + sentenceWithPunctuation.length <= maxLength) {
        currentChunk += sentenceWithPunctuation;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        
        if (sentenceWithPunctuation.length > maxLength) {
          // 如果单个句子太长，按字符分割
          const words = sentenceWithPunctuation.split(/\s+/);
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length + 1 <= maxLength) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk);
              }
              wordChunk = word;
            }
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          } else {
            currentChunk = '';
          }
        } else {
          currentChunk = sentenceWithPunctuation;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * 提取文本摘要（用于显示）
   */
  extractSummary(text: string, maxLength: number = 100): string {
    const plainText = this.extractPlainText(text);
    if (plainText.length <= maxLength) {
      return plainText;
    }

    // 尝试在句子边界截断
    const truncated = plainText.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('！'),
      truncated.lastIndexOf('？'),
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );

    if (lastSentenceEnd > maxLength * 0.7) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    // 在空格处截断
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * 检测文本语言（简单实现）
   */
  detectLanguage(text: string): 'zh' | 'en' | 'mixed' {
    if (!text) return 'zh';

    const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
    const englishChars = text.match(/[a-zA-Z]/g) || [];
    
    const chineseRatio = chineseChars.length / text.length;
    const englishRatio = englishChars.length / text.length;

    if (chineseRatio > 0.3) {
      return englishRatio > 0.3 ? 'mixed' : 'zh';
    } else if (englishRatio > 0.3) {
      return 'en';
    }

    return 'zh'; // 默认中文
  }
}

// 导出单例实例
export const textExtractor = new TextExtractor();