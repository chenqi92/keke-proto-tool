// Syntax Highlighting for ProtoShell Input
import React from 'react';
import { cn } from '@/utils';
import { useShellTheme } from './ThemeConfig';

interface SyntaxHighlightProps {
  input: string;
  className?: string;
}

/**
 * Simple syntax highlighter for shell commands
 * Highlights: commands, arguments, strings, operators, errors
 */
export const SyntaxHighlight: React.FC<SyntaxHighlightProps> = ({ input, className }) => {
  const { getColor } = useShellTheme();

  if (!input) return null;

  const tokens = tokenize(input);

  return (
    <div className={cn('font-mono', className)}>
      {tokens.map((token, index) => (
        <span key={index} style={getTokenStyle(token.type, getColor)}>
          {token.value}
        </span>
      ))}
    </div>
  );
};

interface Token {
  type: 'command' | 'argument' | 'string' | 'operator' | 'error' | 'whitespace';
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let isFirstToken = true;

  while (i < input.length) {
    const char = input[i];

    // Whitespace
    if (/\s/.test(char)) {
      let whitespace = '';
      while (i < input.length && /\s/.test(input[i])) {
        whitespace += input[i];
        i++;
      }
      tokens.push({ type: 'whitespace', value: whitespace });
      continue;
    }

    // Quoted strings
    if (char === '"' || char === "'") {
      const quote = char;
      let string = char;
      i++;
      let closed = false;

      while (i < input.length) {
        string += input[i];
        if (input[i] === quote && input[i - 1] !== '\\') {
          closed = true;
          i++;
          break;
        }
        i++;
      }

      tokens.push({
        type: closed ? 'string' : 'error',
        value: string,
      });
      isFirstToken = false;
      continue;
    }

    // Operators
    if (['|', '>', '<', '&', ';', '(', ')'].includes(char)) {
      let operator = char;
      i++;

      // Handle multi-character operators
      if (i < input.length) {
        const next = input[i];
        if (
          (char === '>' && next === '>') ||
          (char === '&' && next === '&') ||
          (char === '|' && next === '|') ||
          (char === '2' && next === '>')
        ) {
          operator += next;
          i++;
        }
      }

      tokens.push({ type: 'operator', value: operator });
      isFirstToken = false;
      continue;
    }

    // Words (commands or arguments)
    let word = '';
    while (i < input.length && !/[\s|><&;()"']/.test(input[i])) {
      word += input[i];
      i++;
    }

    if (word) {
      tokens.push({
        type: isFirstToken ? 'command' : 'argument',
        value: word,
      });
      isFirstToken = false;
    }
  }

  return tokens;
}

/**
 * Get inline style for token type using theme colors
 */
function getTokenStyle(type: Token['type'], getColor: (key: string) => string): React.CSSProperties {
  switch (type) {
    case 'command':
      return { color: getColor('command'), fontWeight: 600 };
    case 'argument':
      return { color: getColor('argument') };
    case 'string':
      return { color: getColor('string') };
    case 'operator':
      return { color: getColor('operator') };
    case 'error':
      return {
        color: getColor('error'),
        textDecoration: 'underline wavy',
      };
    case 'whitespace':
      return {};
    default:
      return {};
  }
}

/**
 * Ghost suggestion component - shows historical command suggestion
 */
interface GhostSuggestionProps {
  suggestion: string;
  currentInput: string;
}

export const GhostSuggestion: React.FC<GhostSuggestionProps> = ({ suggestion, currentInput }) => {
  if (!suggestion || !suggestion.startsWith(currentInput)) {
    return null;
  }

  const remaining = suggestion.slice(currentInput.length);

  return (
    <span className="text-muted-foreground/40 pointer-events-none">
      {remaining}
    </span>
  );
};

/**
 * Inline diagnostic component - shows errors like unmatched quotes
 */
interface InlineDiagnosticProps {
  input: string;
}

export const InlineDiagnostic: React.FC<InlineDiagnosticProps> = ({ input }) => {
  const diagnostics = getDiagnostics(input);

  if (diagnostics.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 text-xs text-red-500 flex items-center space-x-1">
      <span>⚠</span>
      <span>{diagnostics[0]}</span>
    </div>
  );
};

function getDiagnostics(input: string): string[] {
  const diagnostics: string[] = [];

  // Check for unmatched quotes
  const singleQuotes = (input.match(/'/g) || []).length;
  const doubleQuotes = (input.match(/"/g) || []).length;

  if (singleQuotes % 2 !== 0) {
    diagnostics.push('Unmatched single quote');
  }

  if (doubleQuotes % 2 !== 0) {
    diagnostics.push('Unmatched double quote');
  }

  // Check for unmatched parentheses
  const openParens = (input.match(/\(/g) || []).length;
  const closeParens = (input.match(/\)/g) || []).length;

  if (openParens !== closeParens) {
    diagnostics.push('Unmatched parentheses');
  }

  return diagnostics;
}

