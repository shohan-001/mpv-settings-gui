/**
 * MPV Input Configuration Parser
 *
 * Parses input.conf format into an array of binding objects and can
 * stringify them back. Supports comment lines, blank lines, inline
 * comments, and the standard mpv key-command format.
 *
 * input.conf format:
 *   KEY command [args...]    # optional comment
 *   # full-line comment
 *   (blank lines)
 */

/**
 * @typedef {Object} Binding
 * @property {string} type - 'binding' | 'comment' | 'blank'
 * @property {string} [key] - The key/key-combo (for 'binding' type)
 * @property {string} [command] - The mpv command (for 'binding' type)
 * @property {string} [comment] - Comment text (for 'comment' type or inline comment on 'binding')
 * @property {string} raw - The original raw line text
 */

/**
 * Parse an input.conf string into an array of binding objects.
 *
 * @param {string} inputString - The raw input.conf content
 * @returns {Binding[]}
 */
function parse(inputString) {
  const bindings = [];

  if (!inputString || typeof inputString !== 'string') {
    return bindings;
  }

  const lines = inputString.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // ── Blank line ──────────────────────────────────────────────────────
    if (trimmed === '') {
      bindings.push({
        type: 'blank',
        raw,
      });
      continue;
    }

    // ── Comment line ────────────────────────────────────────────────────
    if (trimmed.startsWith('#')) {
      bindings.push({
        type: 'comment',
        comment: trimmed.substring(1).trim(),
        raw,
      });
      continue;
    }

    // ── Key binding line ────────────────────────────────────────────────
    const parsed = parseBindingLine(trimmed);
    parsed.raw = raw;
    bindings.push(parsed);
  }

  return bindings;
}

/**
 * Parse a single key-binding line into its components.
 *
 * Handles formats:
 *   KEY command
 *   KEY command arg1 arg2
 *   KEY command arg1 arg2 # inline comment
 *   KEY {section} command
 *
 * @param {string} line - Trimmed line
 * @returns {Binding}
 */
function parseBindingLine(line) {
  let inlineComment = '';
  let effective = line;

  // Extract inline comment (# preceded by whitespace, not inside quotes)
  const commentIdx = findInlineComment(line);
  if (commentIdx !== -1) {
    inlineComment = line.substring(commentIdx + 1).trim();
    effective = line.substring(0, commentIdx).trim();
  }

  // Split into key and command
  // The key is the first whitespace-delimited token
  const firstSpaceIdx = effective.search(/\s/);

  if (firstSpaceIdx === -1) {
    // Key only, no command (unusual but handle gracefully)
    const result = {
      type: 'binding',
      key: effective,
      command: '',
    };
    if (inlineComment) result.comment = inlineComment;
    return result;
  }

  const key = effective.substring(0, firstSpaceIdx);
  const command = effective.substring(firstSpaceIdx).trim();

  const result = {
    type: 'binding',
    key,
    command,
  };

  if (inlineComment) {
    result.comment = inlineComment;
  }

  return result;
}

/**
 * Find the position of an inline comment (# not inside quotes).
 *
 * @param {string} line
 * @returns {number} Index of # or -1
 */
function findInlineComment(line) {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (ch === '#' && !inSingleQuote && !inDoubleQuote) {
      // Inline comment must be preceded by whitespace
      if (i > 0 && (line[i - 1] === ' ' || line[i - 1] === '\t')) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Convert an array of binding objects back to an input.conf string.
 *
 * @param {Binding[]} bindings - Array of binding objects
 * @returns {string}
 */
function stringify(bindings) {
  if (!bindings || !Array.isArray(bindings)) return '';

  const lines = bindings.map((binding) => {
    switch (binding.type) {
      case 'blank':
        return '';

      case 'comment':
        // Preserve original raw if available, otherwise reconstruct
        if (binding.raw !== undefined) {
          return binding.raw;
        }
        return binding.comment ? `# ${binding.comment}` : '#';

      case 'binding': {
        // If raw is available and nothing was modified, prefer raw for round-trip
        // Otherwise reconstruct
        let line = '';

        if (binding.key && binding.command) {
          line = `${binding.key} ${binding.command}`;
        } else if (binding.key) {
          line = binding.key;
        } else {
          // Fallback to raw if available
          return binding.raw || '';
        }

        if (binding.comment) {
          line += `   # ${binding.comment}`;
        }

        return line;
      }

      default:
        return binding.raw || '';
    }
  });

  return lines.join('\n');
}

module.exports = { parse, stringify };
