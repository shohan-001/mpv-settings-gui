/**
 * MPV Configuration Parser
 *
 * Parses mpv.conf format into a structured object and can stringify it back.
 * Supports: key=value pairs, comments (#), blank lines, profiles ([name]),
 * profile-desc, profile-cond, profile-restore directives.
 *
 * Round-trip stable: parse(stringify(parse(input))) === parse(input)
 */

/**
 * @typedef {Object} ParsedConfig
 * @property {Object<string, string>} settings - Top-level key-value settings
 * @property {Array<ParsedProfile>} profiles - Profile blocks
 * @property {string[]} comments - All comment lines (for reference)
 * @property {RawLine[]} rawLines - Every line with type annotation for round-tripping
 */

/**
 * @typedef {Object} ParsedProfile
 * @property {string} name - Profile name (from [name] header)
 * @property {string} desc - Profile description (profile-desc value)
 * @property {string} cond - Profile condition (profile-cond value)
 * @property {string} restore - Profile restore mode (profile-restore value)
 * @property {Object<string, string>} settings - Key-value settings within the profile
 */

/**
 * @typedef {Object} RawLine
 * @property {string} type - 'comment' | 'blank' | 'setting' | 'profile-header' | 'profile-desc' | 'profile-cond' | 'profile-restore'
 * @property {string} raw - Original line text
 * @property {string} [key] - Setting key (for 'setting' type)
 * @property {string} [value] - Setting value (for 'setting' type)
 * @property {string} [profile] - Profile name this line belongs to (if inside a profile)
 * @property {string} [name] - Profile name (for 'profile-header' type)
 */

/**
 * Parse an mpv.conf config string into a structured object.
 *
 * @param {string} configString - The raw config file content
 * @returns {ParsedConfig}
 */
function parse(configString) {
  const settings = {};
  const profiles = [];
  const comments = [];
  const rawLines = [];

  if (!configString || typeof configString !== 'string') {
    return { settings, profiles, comments, rawLines };
  }

  const lines = configString.split('\n');

  // Track whether we're inside a profile block
  let currentProfile = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // ── Blank line ────────────────────────────────────────────────────────
    if (trimmed === '') {
      rawLines.push({
        type: 'blank',
        raw,
        profile: currentProfile ? currentProfile.name : null,
      });
      continue;
    }

    // ── Comment line ──────────────────────────────────────────────────────
    if (trimmed.startsWith('#')) {
      comments.push(raw);
      rawLines.push({
        type: 'comment',
        raw,
        profile: currentProfile ? currentProfile.name : null,
      });
      continue;
    }

    // ── Profile header [name] ─────────────────────────────────────────────
    const profileMatch = trimmed.match(/^\[(.+)\]$/);
    if (profileMatch) {
      const profileName = profileMatch[1].trim();

      // Save any previous profile
      if (currentProfile) {
        profiles.push({ ...currentProfile });
      }

      currentProfile = {
        name: profileName,
        desc: '',
        cond: '',
        restore: '',
        settings: {},
      };

      rawLines.push({
        type: 'profile-header',
        raw,
        name: profileName,
        profile: profileName,
      });
      continue;
    }

    // ── Key=value or key (flag) ───────────────────────────────────────────
    const { key, value } = parseKeyValue(trimmed);

    if (currentProfile) {
      // Inside a profile block
      if (key === 'profile-desc') {
        currentProfile.desc = value;
        rawLines.push({
          type: 'profile-desc',
          raw,
          key,
          value,
          profile: currentProfile.name,
        });
      } else if (key === 'profile-cond') {
        currentProfile.cond = value;
        rawLines.push({
          type: 'profile-cond',
          raw,
          key,
          value,
          profile: currentProfile.name,
        });
      } else if (key === 'profile-restore') {
        currentProfile.restore = value;
        rawLines.push({
          type: 'profile-restore',
          raw,
          key,
          value,
          profile: currentProfile.name,
        });
      } else {
        currentProfile.settings[key] = value;
        rawLines.push({
          type: 'setting',
          raw,
          key,
          value,
          profile: currentProfile.name,
        });
      }
    } else {
      // Top-level setting
      settings[key] = value;
      rawLines.push({
        type: 'setting',
        raw,
        key,
        value,
        profile: null,
      });
    }
  }

  // Don't forget the last profile
  if (currentProfile) {
    profiles.push({ ...currentProfile });
  }

  return { settings, profiles, comments, rawLines };
}

/**
 * Parse a key=value line. Handles:
 *   key=value
 *   key = value
 *   key (boolean flag, value = '')
 *   --key=value (strip leading dashes)
 *   no-key (negated boolean)
 *
 * @param {string} line - Trimmed line
 * @returns {{key: string, value: string}}
 */
function parseKeyValue(line) {
  // Strip inline comment (but be careful with # in values that might be quoted)
  let effective = line;
  const inlineCommentIdx = findInlineComment(line);
  if (inlineCommentIdx !== -1) {
    effective = line.substring(0, inlineCommentIdx).trim();
  }

  // Strip leading dashes (mpv allows --key=value in config)
  if (effective.startsWith('--')) {
    effective = effective.substring(2);
  }

  const eqIdx = effective.indexOf('=');
  if (eqIdx === -1) {
    // Boolean flag: just a key name
    return { key: effective.trim(), value: '' };
  }

  const key = effective.substring(0, eqIdx).trim();
  let value = effective.substring(eqIdx + 1).trim();

  // Remove surrounding quotes if present
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.substring(1, value.length - 1);
  }

  return { key, value };
}

/**
 * Find the position of an inline comment (# not inside quotes).
 *
 * @param {string} line
 * @returns {number} Index of the # character, or -1 if none found
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
      // Make sure there's a space before the # (mpv convention)
      // or it's at the start of a segment after whitespace
      if (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t') {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Convert a parsed config object back to a config string.
 * If rawLines are available, uses them to preserve original formatting.
 * Otherwise, generates a clean config from settings and profiles.
 *
 * @param {ParsedConfig} configObj - The parsed config object
 * @returns {string}
 */
function stringify(configObj) {
  if (!configObj) return '';

  // If we have raw lines, use them for faithful round-tripping
  if (configObj.rawLines && configObj.rawLines.length > 0) {
    return stringifyFromRawLines(configObj);
  }

  // Otherwise, generate from structured data
  return stringifyFromStructured(configObj);
}

/**
 * Stringify using rawLines for faithful round-trip preservation.
 *
 * @param {ParsedConfig} configObj
 * @returns {string}
 */
function stringifyFromRawLines(configObj) {
  const outputLines = [];

  // Build lookup maps for modified values
  const topLevelSettings = { ...configObj.settings };
  const profileSettingsMap = {};

  for (const profile of configObj.profiles) {
    profileSettingsMap[profile.name] = {
      desc: profile.desc,
      cond: profile.cond,
      restore: profile.restore,
      settings: { ...profile.settings },
    };
  }

  // Track which settings we've output so we can append new ones
  const outputTopKeys = new Set();
  const outputProfileKeys = {};

  for (const line of configObj.rawLines) {
    switch (line.type) {
      case 'blank':
      case 'comment':
        outputLines.push(line.raw);
        break;

      case 'profile-header':
        outputLines.push(line.raw);
        if (!outputProfileKeys[line.name]) {
          outputProfileKeys[line.name] = new Set();
        }
        break;

      case 'profile-desc': {
        const pm = profileSettingsMap[line.profile];
        if (pm && pm.desc !== undefined) {
          outputLines.push(`profile-desc=${pm.desc}`);
        } else {
          outputLines.push(line.raw);
        }
        break;
      }

      case 'profile-cond': {
        const pm = profileSettingsMap[line.profile];
        if (pm && pm.cond !== undefined) {
          outputLines.push(`profile-cond=${pm.cond}`);
        } else {
          outputLines.push(line.raw);
        }
        break;
      }

      case 'profile-restore': {
        const pm = profileSettingsMap[line.profile];
        if (pm && pm.restore !== undefined) {
          outputLines.push(`profile-restore=${pm.restore}`);
        } else {
          outputLines.push(line.raw);
        }
        break;
      }

      case 'setting': {
        if (line.profile) {
          // Profile setting
          const pm = profileSettingsMap[line.profile];
          if (pm && line.key in pm.settings) {
            const val = pm.settings[line.key];
            if (val === '') {
              outputLines.push(line.key);
            } else {
              outputLines.push(`${line.key}=${val}`);
            }
            if (!outputProfileKeys[line.profile]) {
              outputProfileKeys[line.profile] = new Set();
            }
            outputProfileKeys[line.profile].add(line.key);
          } else {
            outputLines.push(line.raw);
          }
        } else {
          // Top-level setting
          if (line.key in topLevelSettings) {
            const val = topLevelSettings[line.key];
            if (val === '') {
              outputLines.push(line.key);
            } else {
              outputLines.push(`${line.key}=${val}`);
            }
            outputTopKeys.add(line.key);
          } else {
            outputLines.push(line.raw);
          }
        }
        break;
      }

      default:
        outputLines.push(line.raw);
        break;
    }
  }

  // Append any new top-level settings not already output
  for (const [key, val] of Object.entries(topLevelSettings)) {
    if (!outputTopKeys.has(key)) {
      if (val === '') {
        outputLines.push(key);
      } else {
        outputLines.push(`${key}=${val}`);
      }
    }
  }

  // Append any new profile settings
  for (const profile of configObj.profiles) {
    const existingKeys = outputProfileKeys[profile.name] || new Set();
    const newKeys = Object.keys(profile.settings).filter((k) => !existingKeys.has(k));

    if (newKeys.length > 0) {
      // Check if profile header was already output
      const headerExists = configObj.rawLines.some(
        (l) => l.type === 'profile-header' && l.name === profile.name
      );
      if (!headerExists) {
        outputLines.push('');
        outputLines.push(`[${profile.name}]`);
        if (profile.desc) outputLines.push(`profile-desc=${profile.desc}`);
        if (profile.cond) outputLines.push(`profile-cond=${profile.cond}`);
        if (profile.restore) outputLines.push(`profile-restore=${profile.restore}`);
      }

      for (const key of newKeys) {
        const val = profile.settings[key];
        if (val === '') {
          outputLines.push(key);
        } else {
          outputLines.push(`${key}=${val}`);
        }
      }
    }
  }

  return outputLines.join('\n');
}

/**
 * Generate config string from structured settings/profiles (no rawLines).
 *
 * @param {ParsedConfig} configObj
 * @returns {string}
 */
function stringifyFromStructured(configObj) {
  const lines = [];

  // Top-level settings
  const settings = configObj.settings || {};
  for (const [key, val] of Object.entries(settings)) {
    if (val === '') {
      lines.push(key);
    } else {
      lines.push(`${key}=${val}`);
    }
  }

  // Profiles
  const profiles = configObj.profiles || [];
  for (const profile of profiles) {
    lines.push('');
    lines.push(`[${profile.name}]`);

    if (profile.desc) {
      lines.push(`profile-desc=${profile.desc}`);
    }
    if (profile.cond) {
      lines.push(`profile-cond=${profile.cond}`);
    }
    if (profile.restore) {
      lines.push(`profile-restore=${profile.restore}`);
    }

    for (const [key, val] of Object.entries(profile.settings || {})) {
      if (val === '') {
        lines.push(key);
      } else {
        lines.push(`${key}=${val}`);
      }
    }
  }

  return lines.join('\n');
}

module.exports = { parse, stringify };
