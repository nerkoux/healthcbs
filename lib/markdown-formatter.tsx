import React from 'react';

/**
 * Converts markdown-style text to formatted React elements
 * Supports: **bold**, *italic*, # headings, - lists, numbered lists
 */
export function formatMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
  let key = 0;

  const processInlineFormatting = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentText = line;
    let partKey = 0;

    // Process bold (**text**)
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(line)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        const beforeText = line.substring(lastIndex, match.index);
        // Check for italic in beforeText
        const italicParts = processItalic(beforeText);
        parts.push(...italicParts);
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${partKey++}`} className="font-bold text-white">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      const remaining = line.substring(lastIndex);
      const italicParts = processItalic(remaining);
      parts.push(...italicParts);
    }

    return parts.length > 0 ? parts : [line];
  };

  const processItalic = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const italicRegex = /\*(.+?)\*/g;
    let lastIndex = 0;
    let match;
    let partKey = 0;

    while ((match = italicRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <em key={`italic-${partKey++}`} className="italic text-gray-300">
          {match[1]}
        </em>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`list-${key++}`} className="list-disc list-inside space-y-1 ml-4 my-2 text-gray-300">
            {currentList.items}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${key++}`} className="list-decimal list-inside space-y-1 ml-4 my-2 text-gray-300">
            {currentList.items}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushList();
      elements.push(<br key={`br-${key++}`} />);
      continue;
    }

    // Headers (# Header, ## Subheader, ### Section)
    if (line.startsWith('###')) {
      flushList();
      const text = line.substring(3).trim();
      elements.push(
        <h3 key={`h3-${key++}`} className="text-lg font-bold text-white mt-4 mb-2">
          {processInlineFormatting(text)}
        </h3>
      );
    } else if (line.startsWith('##')) {
      flushList();
      const text = line.substring(2).trim();
      elements.push(
        <h2 key={`h2-${key++}`} className="text-xl font-bold text-white mt-4 mb-2">
          {processInlineFormatting(text)}
        </h2>
      );
    } else if (line.startsWith('#')) {
      flushList();
      const text = line.substring(1).trim();
      elements.push(
        <h1 key={`h1-${key++}`} className="text-2xl font-bold text-white mt-4 mb-3">
          {processInlineFormatting(text)}
        </h1>
      );
    }
    // Unordered list (- item or * item)
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.substring(2).trim();
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(
        <li key={`li-${key++}`} className="text-gray-300">
          {processInlineFormatting(text)}
        </li>
      );
    }
    // Numbered list (1. item, 2. item, etc.)
    else if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '').trim();
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(
        <li key={`li-${key++}`} className="text-gray-300">
          {processInlineFormatting(text)}
        </li>
      );
    }
    // Regular paragraph
    else {
      flushList();
      elements.push(
        <p key={`p-${key++}`} className="text-gray-300 my-1 leading-relaxed">
          {processInlineFormatting(line)}
        </p>
      );
    }
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
}
