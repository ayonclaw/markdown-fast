/**
 * parse.js — a fast drop-in for marked 18.1.3 with marked's default options
 * (gfm on, breaks off, pedantic off, async off, no extensions, no hooks).
 *
 * parse(markdown) returns exactly the HTML marked.parse(markdown) returns for
 * that configuration. This file is a specialised rewrite of marked's lexer,
 * tokenizer and parser: only the default (gfm) grammar is kept, the option,
 * hook and extension plumbing is gone, and each token dispatch skips the rules
 * whose first character cannot match. The grammar rules themselves are marked's
 * own (marked is MIT licensed; see vendor/marked/LICENSE and vendor/marked/NOTICE),
 * as is the tokenizing algorithm.
 */

/* ------------------------------------------------------------------ rules -- */

function cachedIndentRegex(createRegex) {
  const cache = [];
  return (indent) => {
    const cacheIndex = Math.max(0, Math.min(3, indent - 1));
    let regex = cache[cacheIndex];
    if (!regex) {
      regex = createRegex(cacheIndex);
      cache[cacheIndex] = regex;
    }
    return regex;
  };
}

function edit(regex, opt = '') {
  let source = typeof regex === 'string' ? regex : regex.source;
  const obj = {
    replace: (name, val) => {
      let valSource = typeof val === 'string' ? val : val.source;
      valSource = valSource.replace(other.caret, '$1');
      source = source.replace(name, valSource);
      return obj;
    },
    getRegex: () => new RegExp(source, opt),
  };
  return obj;
}

const supportsLookbehind = ((a = '') => {
  try {
    return !!new RegExp('(?<=1)(?<!1)' + a);
  } catch {
    return false;
  }
})();

const other = {
  codeRemoveIndent: /^(?: {0,3}\t| {1,4})/gm,
  outputLinkReplace: /\\([[\]])/g,
  indentCodeCompensation: /^(\s+)(?:```)/,
  beginningSpace: /^\s+/,
  endingHash: /#$/,
  startingSpaceChar: /^ /,
  endingSpaceChar: / $/,
  endingSpaceTabChar: /[ \t]$/,
  nonSpaceChar: /[^ ]/,
  newLineCharGlobal: /\n/g,
  tabCharGlobal: /\t/g,
  leadingSpaceTab: /^[ \t]+/,
  multipleSpaceGlobal: /\s+/g,
  blankLine: /^[ \t]*$/,
  doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
  blockquoteStart: /^ {0,3}>/,
  blockquoteSetextReplace: /\n {0,3}((?:=+|-+)[ \t]*)(?=\n|$)/g,
  blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
  blockquoteMarkerWhitespace: /^( {0,3}>)([ \t]+)/gm,
  listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
  listIsTask: /^\[[ xX]\][ \t]+\S/,
  listReplaceTask: /^\[[ xX]\][ \t]+/,
  listTaskCheckbox: /\[[ xX]\]/,
  anyLine: /\n.*\n/,
  hrefBrackets: /^<(.*)>$/,
  tableDelimiter: /[:|]/,
  tableAlignChars: /^\||\| *$/g,
  tableRowBlankLine: /\n[ \t]*$/,
  tableAlignRight: /^ *-+: *$/,
  tableAlignCenter: /^ *:-+: *$/,
  tableAlignLeft: /^ *:-+ *$/,
  startATag: /^<a /i,
  endATag: /^<\/a>/i,
  startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
  endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
  startAngleBracket: /^</,
  endAngleBracket: />$/,
  pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
  unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
  numericCharacterReference: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/,
  numericCharacterReferenceOrAmpersand: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  escapeTest: /[&<>"']/,
  escapeReplace: /[&<>"']/g,
  escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  caret: /(^|[^[])\^/g,
  percentDecode: /%25/g,
  findPipe: /\|/g,
  splitPipe: / \|/,
  slashPipe: /\\\|/g,
  carriageReturn: /\r\n|\r/g,
  spaceLine: /^ +$/gm,
  notSpaceStart: /^\S*/,
  endingNewline: /\n$/,
  listItemRegex: (bull) => new RegExp(`^( {0,3}${bull})((?:[\\t ][^\\n]*)?(?:\\n|$))`),
  nextBulletRegex: cachedIndentRegex((indent) => new RegExp(`^ {0,${indent}}(?:[*+-]|\\d{1,9}[.)])((?:[ \\t][^\\n]*)?(?:\\n|$))`)),
  hrRegex: cachedIndentRegex((indent) => new RegExp(`^ {0,${indent}}((?:-[ \\t]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)`)),
  fencesBeginRegex: cachedIndentRegex((indent) => new RegExp(`^ {0,${indent}}(?:\`\`\`|~~~)`)),
  headingBeginRegex: cachedIndentRegex((indent) => new RegExp(`^ {0,${indent}}#{1,6}(?:\\s|$)`)),
  pedanticHeadingBeginRegex: cachedIndentRegex((indent) => new RegExp(`^ {0,${indent}}#`)),
  htmlBeginRegex: cachedIndentRegex((indent) => new RegExp(`^ {0,${indent}}(?:</?(?:${_tag})(?: +|$|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)`, 'i')),
  blockquoteBeginRegex: cachedIndentRegex((indent) => new RegExp(`^ {0,${indent}}>`)),
};

const newline = /^(?:[ \t]*(?:\n|$))+/;
const blockCode = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
const fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}(?:(?=`)\1`*|(?=~)\1~*) *(?=\n|$)|$)/;
const hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
const heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
const bullet = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
const lheadingCore = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |fences|blockquote|heading|hr|html|table))+?)\n {0,3}(=+|-+)[ \t]*(?:\n+|$)/;
const lheading = edit(lheadingCore)
  .replace(/bull/g, bullet)
  .replace(/blockCode/g, /(?: {4}| {0,3}\t)/)
  .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/)
  .replace(/blockquote/g, / {0,3}>/)
  .replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/)
  .replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/)
  .replace(/html/g, / {0,3}<[^\n>]+>\n/)
  .replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/)
  .getRegex();
const _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
const blockText = /^[^\n]+/;
const _blockLabel = /(?!\s*\])(?:\\[\s\S]|[^[\]\\\n]|\n(?![ \t]*\n))+/;
const def = edit(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/)
  .replace('label', _blockLabel)
  .replace('title', /(?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\\n]|\n(?!\n))*'|\((?:\\[\s\S]|[^()\\])*\))/)
  .getRegex();

const listRule = edit(/^(bull)([ \t][^\n]*?)?(?:\n|$)/)
  .replace(/bull/g, bullet)
  .getRegex();

const _tag = 'address|article|aside|base|basefont|blockquote|body|caption'
  + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
  + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
  + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
  + '|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title'
  + '|tr|track|ul';
const _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
const html = edit(
  '^ {0,3}(?:'
  + '<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)'
  + '|comment[^\\n]*(\\n+|$)'
  + '|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)'
  + '|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)'
  + '|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)'
  + '|</?(tag)(?:[ \\t]+|\\n|/?>|$)[\\s\\S]*?(?:(?:\\n[ \\t]*)+\\n|$)'
  + '|<(?!(?:script|pre|style|textarea)(?![a-z0-9-]))([a-z][a-z0-9-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \\t]*)+\\n|$)'
  + '|</[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \\t]*)+\\n|$)'
  + ')', 'i')
  .replace('comment', _comment)
  .replace('tag', _tag)
  .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
  .getRegex();

// gfm paragraph rule (blockGfm.paragraph)
const paragraph = edit(_paragraph)
  .replace('hr', hr)
  .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
  .replace('|lheading', '')
  .replace('table', edit(
    '^ *([^\\n ].*)\\n'
    + ' {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)'
    + '(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)')
    .replace('hr', hr)
    .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
    .replace('blockquote', ' {0,3}>')
    .replace('code', '(?: {4}| {0,3}\\t)[^\\n]')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)')
    .replace('list', ' {0,3}(?:[*+-]|1[.)])[ \\t]')
    .replace('html', ' {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)')
    .replace('tag', _tag)
    .getRegex())
  .replace('blockquote', ' {0,3}>')
  .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)')
  .replace('list', ' {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]')
  .replace('html', ' {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)')
  .replace('tag', _tag)
  .getRegex();

const gfmTable = edit(
  '^ *([^\\n ].*)\\n'
  + ' {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)'
  + '(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)')
  .replace('hr', hr)
  .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
  .replace('blockquote', ' {0,3}>')
  .replace('code', '(?: {4}| {0,3}\\t)[^\\n]')
  .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)')
  .replace('list', ' {0,3}(?:[*+-]|1[.)])[ \\t]')
  .replace('html', ' {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)')
  .replace('tag', _tag)
  .getRegex();

/* ----------------------------------------------------------- inline rules -- */

const escape = /^\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/;
const inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
const br = /^( {2,}|\\)\n(?!\s*$)[ \t]*/;

const _punctuation = /[\p{P}\p{S}]/u;
const _punctuationOrSpace = /[\s\p{P}\p{S}]/u;
const _notPunctuationOrSpace = /[^\s\p{P}\p{S}]/u;
const punctuation = edit(/^((?![*_])punctSpace)/, 'u')
  .replace(/punctSpace/g, _punctuationOrSpace).getRegex();

const _punctuationGfmStrongEm = /(?!~)[\p{P}\p{S}]/u;
const _punctuationOrSpaceGfmStrongEm = /(?!~)[\s\p{P}\p{S}]/u;
const _notPunctuationOrSpaceGfmStrongEm = /(?:[^\s\p{P}\p{S}]|~)/u;

const blockSkip = edit(/link|precode-code|html/, 'g')
  .replace('link', /\[(?:[^[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\()]|\((?:\\[\s\S]|[^\\()])*\))*\)/)
  .replace('precode-', supportsLookbehind ? '(?<!`)()' : '(^^|[^`])')
  .replace('code', /(?<b>`+)[^`]+\k<b>(?!`)/)
  .replace('html', /<(?! )[^<>]*?>/)
  .getRegex();

const emStrongLDelimCore = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;

const emStrongLDelim = edit(emStrongLDelimCore, 'u')
  .replace(/punct/g, _punctuationGfmStrongEm)
  .getRegex();

const emStrongRDelimAstCore =
  '^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)'
  + '|[^*]+(?=[^*])'
  + '|(?!\\*)punct(\\*+)(?=[\\s]|$)'
  + '|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)'
  + '|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)'
  + '|[\\s](\\*+)(?!\\*)(?=punct)'
  + '|(?!\\*)punct(\\*+)(?!\\*)(?=punct)'
  + '|notPunctSpace(\\*+)(?=notPunctSpace)';

const emStrongRDelimAst = edit(emStrongRDelimAstCore, 'gu')
  .replace(/notPunctSpace/g, _notPunctuationOrSpaceGfmStrongEm)
  .replace(/punctSpace/g, _punctuationOrSpaceGfmStrongEm)
  .replace(/punct/g, _punctuationGfmStrongEm)
  .getRegex();

const emStrongRDelimUnd = edit(
  '^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)'
  + '|[^_]+(?=[^_])'
  + '|(?!_)punct(_+)(?=[\\s]|$)'
  + '|notPunctSpace(_+)(?!_)(?=punctSpace|$)'
  + '|(?!_)punctSpace(_+)(?=notPunctSpace)'
  + '|[\\s](_+)(?!_)(?=punct)'
  + '|(?!_)punct(_+)(?!_)(?=punct)', 'gu')
  .replace(/notPunctSpace/g, _notPunctuationOrSpace)
  .replace(/punctSpace/g, _punctuationOrSpace)
  .replace(/punct/g, _punctuation)
  .getRegex();

const delLDelim = edit(/^~~?(?:((?!~)punct)|[^\s~])/, 'u')
  .replace(/punct/g, _punctuation)
  .getRegex();

const delRDelimCore =
  '^[^~]+(?=[^~])'
  + '|(?!~)punct(~~?)(?=[\\s]|$)'
  + '|notPunctSpace(~~?)(?!~)(?=punctSpace|$)'
  + '|(?!~)punctSpace(~~?)(?=notPunctSpace)'
  + '|[\\s](~~?)(?!~)(?=punct)'
  + '|(?!~)punct(~~?)(?!~)(?=punct)'
  + '|notPunctSpace(~~?)(?=notPunctSpace)';

const delRDelim = edit(delRDelimCore, 'gu')
  .replace(/notPunctSpace/g, _notPunctuationOrSpace)
  .replace(/punctSpace/g, _punctuationOrSpace)
  .replace(/punct/g, _punctuation)
  .getRegex();

const anyPunctuation = edit(/\\(punct)/, 'gu')
  .replace(/punct/g, _punctuation)
  .getRegex();

const anyPunctuationOutsideCode = edit(/(`+)(?:[^`]|[^`][\s\S]*?[^`])\1(?!`)|`+|\\(punct)/, 'gu')
  .replace(/punct/g, _punctuation)
  .getRegex();

const autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/)
  .replace('scheme', /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/)
  .replace('email', /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/)
  .getRegex();

const _inlineComment = edit(_comment).replace('(?:-->|$)', '-->').getRegex();
const tag = edit(
  '^comment'
  + '|^</[a-zA-Z][a-zA-Z0-9-]*\\s*>'
  + '|^<[a-zA-Z][a-zA-Z0-9-]*(?:attribute)*?\\s*/?>'
  + '|^<\\?[\\s\\S]*?\\?>'
  + '|^<![a-zA-Z]+\\s[\\s\\S]*?>'
  + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>')
  .replace('comment', _inlineComment)
  .replace('attribute', /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/)
  .getRegex();

const _inlineLabelBrackets = /\[(?:\\[\s\S]|[^[\]\\])*\]/;
const _inlineLabel = edit(/(?:\[(?:brackets|\\[\s\S]|[^[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^[\]\\`])*?/)
  .replace('brackets', _inlineLabelBrackets)
  .getRegex();

const link = edit(/^!?\[(label)\]\([ \t\n]*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?[ \t\n]*\)/)
  .replace('label', _inlineLabel)
  .replace('href', /<(?:\\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/)
  .replace('title', /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\((?:\\[\s\S]|[^)\\])*\)/)
  .getRegex();

const reflink = edit(/^!?\[(label)\]\[(ref)\]/)
  .replace('label', _inlineLabel)
  .replace('ref', _blockLabel)
  .getRegex();

const nolink = edit(/^!?\[(ref)\](?:\[\])?/)
  .replace('ref', _blockLabel)
  .getRegex();

const _boundedBlockLabel = /(?!\s*\])(?:\\[\s\S]|[^[\]\\]){1,999}/;
const _boundedInlineLabel = edit(/(?:[^[\]\\`]*(?:\[(?:brackets|\\[\s\S]|[^[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\]))){0,999}?[^[\]\\`]*?/)
  .replace('brackets', _inlineLabelBrackets)
  .getRegex();

const reflinkSearch = edit('reflink|nolink(?!\\()', 'g')
  .replace('reflink', edit(/^!?\[(label)\]\[(ref)\]/)
    .replace('label', _boundedInlineLabel)
    .replace('ref', _boundedBlockLabel)
    .getRegex())
  .replace('nolink', edit(/^!?\[(ref)\](?:\[\])?/)
    .replace('ref', _boundedBlockLabel)
    .getRegex())
  .getRegex();

const _caseInsensitiveProtocol = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
const _extendedEmail = /[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/;
const _extendedEmailProtocol = edit(/(?:mailto:email|xmpp:email(?:\/[A-Za-z0-9@.]+)?)/)
  .replace(/email/g, _extendedEmail)
  .getRegex();

const url = edit(/^emailProtocol|^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/)
  .replace('emailProtocol', _extendedEmailProtocol)
  .replace('protocol', _caseInsensitiveProtocol)
  .replace('email', /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/)
  .getRegex();

const _backpedal = /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/;

const del = /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/;

const inlineText = edit(/^(?:[^a-zA-Z0-9](?=emailProtocol)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|wwwStart|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9](?=emailProtocol)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))))/)
  .replace('protocol', _caseInsensitiveProtocol)
  .replace(/emailProtocol/g, /(?:mailto|xmpp):/)
  .replace('wwwStart', supportsLookbehind ? '(?<![^\\s*_~(])www\\.' : 'www\\.')
  .getRegex();

/* ---------------------------------------------------------------- helpers -- */

const escapeReplacements = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const getEscapeReplacement = (ch) => escapeReplacements[ch];

const CH_AMP = 38;
const CH_LT = 60;
const CH_GT = 62;
const CH_QUOT = 34;
const CH_APOS = 39;
const CH_HASH = 35;
const CH_SEMI = 59;

function isDigitCode(c) {
  return c >= 48 && c <= 57;
}

function isHexCode(c) {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
}

function isWordCode(c) {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
}

/** Does the `&` at `i` start a character reference (`&#123;`, `&#x1F;`, `&amp;`)? */
function isEntityAt(s, i) {
  const n = s.length;
  let j = i + 1;
  if (j >= n) return false;
  let c = s.charCodeAt(j);
  if (c === CH_HASH) {
    j++;
    if (j >= n) return false;
    c = s.charCodeAt(j);
    if (c === 88 || c === 120) {
      j++;
      let k = 0;
      while (j < n && isHexCode(s.charCodeAt(j))) {
        j++;
        k++;
      }
      return k >= 1 && k <= 6 && j < n && s.charCodeAt(j) === CH_SEMI;
    }
    let k = 0;
    while (j < n && isDigitCode(s.charCodeAt(j))) {
      j++;
      k++;
    }
    return k >= 1 && k <= 7 && j < n && s.charCodeAt(j) === CH_SEMI;
  }
  let k = 0;
  while (j < n && isWordCode(s.charCodeAt(j))) {
    j++;
    k++;
  }
  return k >= 1 && j < n && s.charCodeAt(j) === CH_SEMI;
}

/**
 * `escapeHtmlEntities(html, true)` escapes the five characters always;
 * `escapeHtmlEntities(html)` leaves character references alone.
 */
const ESCAPE_ALWAYS = new Uint8Array(128);
ESCAPE_ALWAYS[CH_LT] = 1;
ESCAPE_ALWAYS[CH_GT] = 1;
ESCAPE_ALWAYS[CH_QUOT] = 1;
ESCAPE_ALWAYS[CH_APOS] = 1;
const ESCAPE_ALWAYS_REP = [];
ESCAPE_ALWAYS_REP[CH_LT] = '&lt;';
ESCAPE_ALWAYS_REP[CH_GT] = '&gt;';
ESCAPE_ALWAYS_REP[CH_QUOT] = '&quot;';
ESCAPE_ALWAYS_REP[CH_APOS] = '&#39;';

function escapeHtmlEntities(html, encode) {
  const n = html.length;
  let i = 0;
  while (i < n) {
    const c = html.charCodeAt(i);
    if (c < 128) {
      if (c === CH_AMP) {
        if (encode || !isEntityAt(html, i)) break;
      } else if (ESCAPE_ALWAYS[c] === 1) break;
    }
    i++;
  }
  if (i === n) return html;
  let out = html.slice(0, i);
  let start = i;
  for (; i < n; i++) {
    const c = html.charCodeAt(i);
    let rep;
    if (c < 128) {
      if (c === CH_AMP) {
        if (encode || !isEntityAt(html, i)) rep = '&amp;';
      } else if (ESCAPE_ALWAYS[c] === 1) rep = ESCAPE_ALWAYS_REP[c];
    }
    if (rep === undefined) continue;
    if (start !== i) out += html.slice(start, i);
    out += rep;
    start = i + 1;
  }
  return start === n ? out : out + html.slice(start);
}

function decodeNumericCharacterReferences(text) {
  if (text.indexOf('&') === -1 || !other.numericCharacterReference.test(text)) {
    return text;
  }
  return text.replace(other.numericCharacterReferenceOrAmpersand, (ref, dec, hex) => {
    if (dec === undefined && hex === undefined) {
      return '&amp;';
    }
    const code = dec === undefined ? Number.parseInt(hex, 16) : Number.parseInt(dec, 10);
    if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
      return '\uFFFD';
    }
    return code === 38 ? '&amp;' : String.fromCodePoint(code);
  });
}

function cleanUrl(href) {
  try {
    href = encodeURI(href).replace(other.percentDecode, '%');
  } catch {
    return null;
  }
  return href;
}

function splitCells(tableRow, count) {
  const row = tableRow.replace(other.findPipe, (match, offset, str) => {
    let escaped = false;
    let curr = offset;
    while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
    if (escaped) {
      return '|';
    }
    return ' |';
  }),
  cells = row.split(other.splitPipe);
  let i = 0;

  if (!cells[0].trim()) {
    cells.shift();
  }
  if (cells.length > 0 && !cells[cells.length - 1].trim()) {
    cells.pop();
  }

  if (count) {
    if (cells.length > count) {
      cells.splice(count);
    } else {
      while (cells.length < count) cells.push('');
    }
  }

  for (; i < cells.length; i++) {
    cells[i] = cells[i].trim().replace(other.slashPipe, '|');
  }
  return cells;
}

function rtrim(str, c, invert) {
  const l = str.length;
  if (l === 0) {
    return '';
  }
  let suffLen = 0;
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }
  return str.slice(0, l - suffLen);
}

function trimTrailingBlankLines(str) {
  const lines = str.split('\n');
  let end = lines.length - 1;
  while (end >= 0 && other.blankLine.test(lines[end])) {
    end--;
  }
  if (lines.length - end <= 2) {
    return str;
  }
  return lines.slice(0, end + 1).join('\n');
}

function normalizeLabel(label) {
  return label.trim().replace(other.multipleSpaceGlobal, ' ').toLowerCase().toUpperCase().toLowerCase();
}

function findClosingBracket(str, b) {
  if (str.indexOf(b[0]) === -1 && str.indexOf(b[1]) === -1) {
    return -1;
  }
  let level = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\\') {
      i++;
    } else if (str[i] === b[0]) {
      level++;
    } else if (str[i] === b[1]) {
      level--;
      if (level < 0) {
        return i;
      }
    }
  }
  if (level > 0) {
    return -2;
  }
  return -1;
}

function expandTabs(line, indent = 0) {
  let col = indent;
  let expanded = '';
  for (const char of line) {
    if (char === '\t') {
      const added = 4 - (col % 4);
      expanded += ' '.repeat(added);
      col += added;
    } else {
      expanded += char;
      col++;
    }
  }
  return expanded;
}

/** Length in code points of a string's leading character (1 or 2 code units). */
function firstCharLength(s) {
  const c = s.charCodeAt(0);
  if (c >= 0xd800 && c <= 0xdbff) {
    const d = s.charCodeAt(1);
    if (d >= 0xdc00 && d <= 0xdfff) return 2;
  }
  return 1;
}

/** Code point length of a short (delimiter) string. */
function cpLength(s) {
  let n = s.length;
  for (let i = 0; i < n - 1; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        n--;
        i++;
      }
    }
  }
  return n;
}

/* --------------------------------------------------------- lexer state ----- */

let links = Object.create(null);
let topTokens = [];
let inlineQueue = [];
const state = {
  inLink: false,
  inRawBlock: false,
  linkEmitted: false,
  linkParenPossible: true,
  top: true,
};

const hintStack = [];

/** Last `*` / `_` run that can close emphasis or strong, and last `~` run. */
function scanClosers(src) {
  const lastEm = { '*': -1, _: -1 };
  let lastDel = -1;
  const len = src.length;
  for (let i = 0; i < len; i++) {
    const c = src.charCodeAt(i);
    if (c !== 42 && c !== 95 && c !== 126) continue;
    const ch = c === 42 ? '*' : c === 95 ? '_' : '~';
    const prev = i === 0 ? '\n' : src[i - 1];
    let j = i + 1;
    while (j < len && src.charCodeAt(j) === c) j++;
    if (prev !== ' ' && prev !== '\t' && prev !== '\n' && prev !== '\r' && prev !== '\f') {
      if (c === 126) {
        lastDel = i;
      } else {
        lastEm[ch] = i;
      }
    }
    i = j - 1;
  }
  return { maskedSrc: src, lastEm, lastDel };
}

function pushHints(maskedSrc) {
  hintStack.push(scanClosers(maskedSrc));
}

function popHints() {
  hintStack.pop();
}

function lastEmCloserIndex(maskedSrc, delim) {
  const frame = hintStack[hintStack.length - 1];
  if (frame !== undefined && frame.maskedSrc === maskedSrc) {
    return frame.lastEm[delim];
  }
  return scanClosers(maskedSrc).lastEm[delim];
}

function lastDelCloserIndex(maskedSrc) {
  const frame = hintStack[hintStack.length - 1];
  if (frame !== undefined && frame.maskedSrc === maskedSrc) {
    return frame.lastDel;
  }
  return scanClosers(maskedSrc).lastDel;
}

/* ------------------------------------------------------- block tokenizer -- */

function tSpace(src) {
  const cap = newline.exec(src);
  if (cap && cap[0].length > 0) {
    return { type: 'space', raw: cap[0] };
  }
}

function tCode(src) {
  const cap = blockCode.exec(src);
  if (cap) {
    const raw = trimTrailingBlankLines(cap[0]);
    return {
      type: 'code',
      raw,
      codeBlockStyle: 'indented',
      text: raw.replace(other.codeRemoveIndent, ''),
    };
  }
}

function indentCodeCompensation(raw, text) {
  const matchIndentToCode = raw.match(other.indentCodeCompensation);
  if (matchIndentToCode === null) {
    return text;
  }
  const indentToCode = matchIndentToCode[1];
  return text
    .split('\n')
    .map(node => {
      const matchIndentInNode = node.match(other.beginningSpace);
      if (matchIndentInNode === null) {
        return node;
      }
      const indentInNode = matchIndentInNode[0];
      return node.slice(Math.min(indentInNode.length, indentToCode.length));
    })
    .join('\n');
}

function tFences(src) {
  const cap = fences.exec(src);
  if (cap) {
    const raw = cap[0];
    const text = indentCodeCompensation(raw, cap[3] || '');
    return {
      type: 'code',
      raw,
      lang: cap[2] ? cap[2].trim().replace(anyPunctuation, '$1') : cap[2],
      text,
    };
  }
}

function tHeading(src) {
  const cap = heading.exec(src);
  if (cap) {
    let text = cap[2].trim();
    if (other.endingHash.test(text)) {
      const trimmed = rtrim(text, '#');
      if (!trimmed || other.endingSpaceTabChar.test(trimmed)) {
        text = trimmed.trim();
      }
    }
    return {
      type: 'heading',
      raw: rtrim(cap[0], '\n'),
      depth: cap[1].length,
      text,
      tokens: inline(text),
    };
  }
}

function tHr(src) {
  const cap = hr.exec(src);
  if (cap) {
    return { type: 'hr', raw: rtrim(cap[0], '\n') };
  }
}

function tBlockquote(src) {
  const cap = blockquoteRule.exec(src);
  if (cap) {
    let lines = rtrim(cap[0], '\n').split('\n');
    let raw = '';
    let text = '';
    const tokens = [];

    while (lines.length > 0) {
      let inBlockquote = false;
      const currentLines = [];

      let i;
      for (i = 0; i < lines.length; i++) {
        if (other.blockquoteStart.test(lines[i])) {
          currentLines.push(lines[i]);
          inBlockquote = true;
        } else if (!inBlockquote) {
          currentLines.push(lines[i]);
        } else {
          break;
        }
      }
      lines = lines.slice(i);

      const currentRaw = currentLines.join('\n');
      const currentText = currentRaw
        .replace(other.blockquoteMarkerWhitespace, (_, marker, whitespace) => marker + expandTabs(whitespace, marker.length))
        .replace(other.blockquoteSetextReplace, '\n    $1')
        .replace(other.blockquoteSetextReplace2, '');
      raw = raw ? `${raw}\n${currentRaw}` : currentRaw;
      text = text ? `${text}\n${currentText}` : currentText;

      const top = state.top;
      state.top = true;
      blockTokens(currentText, tokens, true);
      state.top = top;

      if (lines.length === 0) {
        break;
      }

      const lastToken = tokens[tokens.length - 1];

      if (lastToken.type === 'code' || lastToken.type === 'heading' || lastToken.type === 'hr' || lastToken.type === 'html' || lastToken.type === 'table') {
        break;
      } else if (lastToken.type === 'blockquote') {
        const oldToken = lastToken;
        const continuation = lines.join('\n');
        const newText = oldToken.raw + '\n' + continuation.replace(other.blockquoteSetextReplace2, '');
        const newToken = tBlockquote(newText);
        tokens[tokens.length - 1] = newToken;

        const leftover = newText.substring(newToken.raw.length).replace(/^\n/, '');
        const leftoverCount = leftover ? leftover.split('\n').length : 0;
        const consumed = leftoverCount ? lines.slice(0, -leftoverCount) : lines;
        if (consumed.length > 0) {
          raw = `${raw}\n${consumed.join('\n')}`;
        }
        text = text.substring(0, text.length - oldToken.text.length) + newToken.text;

        lines = lines.slice(consumed.length);
        if (lines.length > 0 && other.blockquoteStart.test(lines[0])) {
          continue;
        }
        break;
      } else if (lastToken.type === 'list') {
        const oldToken = lastToken;
        const newText = oldToken.raw + '\n' + lines.join('\n');
        const newToken = tList(newText);
        tokens[tokens.length - 1] = newToken;

        const consumedCount = newToken.raw.length > oldToken.raw.length
          ? newText.slice(oldToken.raw.length + 1, newToken.raw.length).split('\n').length
          : 0;
        if (consumedCount > 0) {
          const consumed = lines.slice(0, consumedCount).join('\n');
          raw = `${raw}\n${consumed}`;
          text = `${text}\n${consumed}`;
        }
        lines = lines.slice(consumedCount);
        continue;
      }
    }

    return { type: 'blockquote', raw, tokens, text };
  }
}


/** Index of the first character that is not a space (-1 when the line is all spaces). */
function firstNonSpace(line) {
  for (let i = 0; i < line.length; i++) {
    if (line.charCodeAt(i) !== 32) return i;
  }
  return -1;
}

/** JavaScript's `str.trim() === ''`, as a scan. */
function isBlankJs(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12) continue;
    if (c < 0x80) return false;
    if (c === 0xa0 || c === 0x1680 || c === 0x2028 || c === 0x2029 || c === 0x202f
      || c === 0x205f || c === 0x3000 || c === 0xfeff || (c >= 0x2000 && c <= 0x200a)) continue;
    return false;
  }
  return true;
}

/** `line.replace(/^[ \t]+/, ws => expandTabs(ws, indent))`, without the regex when no tab. */
function expandLeading(line, indent) {
  const n = line.length;
  let i = 0;
  let tab = false;
  while (i < n) {
    const c = line.charCodeAt(i);
    if (c === 32) {
      i++;
    } else if (c === 9) {
      tab = true;
      i++;
    } else {
      break;
    }
  }
  if (!tab) return line;
  return expandTabs(line.slice(0, i), indent) + line.slice(i);
}

/** `line.replace(/\t/g, '    ').search(/[^ ]/)`: column of the first non-space, tabs count 4. */
function firstNonSpaceColumn(line) {
  let col = 0;
  const n = line.length;
  for (let i = 0; i < n; i++) {
    const c = line.charCodeAt(i);
    if (c === 9) {
      col += 4;
    } else if (c === 32) {
      col++;
    } else {
      return col;
    }
  }
  return -1;
}

function tList(src) {
  const listSrc = src;
  let cap = listRule.exec(src);
  if (cap) {
    let bull = cap[1].trim();
    const isordered = bull.length > 1;

    const listToken = {
      type: 'list',
      raw: '',
      ordered: isordered,
      start: isordered ? +bull.slice(0, -1) : '',
      loose: false,
      items: [],
    };

    bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;

    const itemRegex = other.listItemRegex(bull);
    let endsWithBlankLine = false;

    while (src.length > 0) {
      let endEarly = false;
      let itemContents = '';
      if (!(cap = itemRegex.exec(src))) {
        break;
      }

      if (hr.test(src)) {
        break;
      }

      const itemStart = listSrc.length - src.length;
      src = src.substring(cap[0].length);

      const nl = cap[2].indexOf('\n');
      const firstLine = nl === -1 ? cap[2] : cap[2].slice(0, nl);
      const bulletIndent = cap[1].length;
      let line = expandLeading(firstLine, bulletIndent);
      let nextLine = lineEnd(src);
      let blankLine = isBlankJs(line);

      let indent = 0;
      if (blankLine) {
        indent = bulletIndent + 1;
      } else {
        const k = firstNonSpace(line);
        indent = k > 4 ? 1 : k;
        itemContents = line.slice(indent);
        indent += bulletIndent;
      }

      if (blankLine && other.blankLine.test(nextLine)) {
        src = src.substring(nextLine.length + 1);
        endEarly = true;
      }

      if (!endEarly) {
        const nextBulletRegex = other.nextBulletRegex(indent);
        const hrRegex = other.hrRegex(indent);
        const fencesBeginRegex = other.fencesBeginRegex(indent);
        const headingBeginRegex = other.headingBeginRegex(indent);
        const htmlBeginRegex = other.htmlBeginRegex(indent);
        const blockquoteBeginRegex = other.blockquoteBeginRegex(indent);

        while (src.length > 0) {
          const rawLine = lineEnd(src);
          nextLine = rawLine;

          const tabless = expandLeading(rawLine, 0);
          const si = firstNonSpace(rawLine);
          const c = si === -1 ? -1 : rawLine.charCodeAt(si);

          if (si <= indent && si !== -1) {
            let stop = false;
            if (c === 96 || c === 126) {
              stop = fencesBeginRegex.test(nextLine);
            } else if (c === 35) {
              stop = headingBeginRegex.test(nextLine);
            } else if (c === 60) {
              stop = htmlBeginRegex.test(nextLine);
            } else if (c === 62) {
              stop = blockquoteBeginRegex.test(nextLine);
            } else if (c === 42 || c === 43 || c === 45) {
              stop = nextBulletRegex.test(nextLine) || (c !== 43 && hrRegex.test(nextLine));
            } else if (c >= 48 && c <= 57) {
              stop = nextBulletRegex.test(nextLine);
            } else if (c === 95) {
              stop = hrRegex.test(nextLine);
            }
            if (stop) {
              break;
            }
          }

          if (firstNonSpace(tabless) >= indent || isBlankJs(nextLine)) {
            itemContents += '\n' + tabless.slice(indent);
          } else {
            if (blankLine) {
              break;
            }
            if (firstNonSpaceColumn(line) >= 4) {
              break;
            }
            if (fencesBeginRegex.test(line)) {
              break;
            }
            if (headingBeginRegex.test(line)) {
              break;
            }
            if (htmlBeginRegex.test(line)) {
              break;
            }
            if (hrRegex.test(line)) {
              break;
            }

            let setextContinuation = false;
            if (c === 61 || c === 45) {
              setextContinuation = /^ {0,3}(?:=+|-+) *$/.test(nextLine) && lheading.test(`${line}\n${nextLine}`);
            }
            const continuation = setextContinuation
              ? `    ${tabless.replace(/^ {0,3}/, '')}`
              : nextLine;
            itemContents += '\n' + continuation;
          }

          blankLine = isBlankJs(nextLine);

          src = src.substring(rawLine.length + 1);
          line = tabless.slice(indent);
        }
      }

      const raw = listSrc.slice(itemStart, listSrc.length - src.length);

      if (!listToken.loose) {
        if (endsWithBlankLine) {
          listToken.loose = true;
        } else if (other.doubleBlankLine.test(raw)) {
          endsWithBlankLine = true;
        }
      }

      listToken.items.push({
        type: 'list_item',
        raw,
        task: itemContents.charCodeAt(0) === 91 && other.listIsTask.test(itemContents),
        loose: false,
        text: itemContents,
        tokens: [],
      });
    }

    const items = listToken.items;
    const lastItem = items.length > 0 ? items[items.length - 1] : undefined;
    if (lastItem) {
      lastItem.raw = lastItem.raw.trimEnd();
      lastItem.text = lastItem.text.trimEnd();
    } else {
      return;
    }
    listToken.raw = listSrc.slice(0, listSrc.length - src.length).trimEnd();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      state.top = false;
      item.tokens = blockTokens(item.text, []);

      if (!listToken.loose) {
        let hasMultipleLineBreaks = false;
        for (let t = 0; t < item.tokens.length; t++) {
          const tok = item.tokens[t];
          if (tok.type === 'space' && other.anyLine.test(tok.raw)) {
            hasMultipleLineBreaks = true;
            break;
          }
        }
        listToken.loose = hasMultipleLineBreaks;
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemToken = item.tokens[0];
      if (item.task && itemToken !== undefined && (itemToken.type === 'text' || itemToken.type === 'paragraph')) {
        item.text = item.text.replace(other.listReplaceTask, '');
        itemToken.raw = itemToken.raw.replace(other.listReplaceTask, '');
        itemToken.text = itemToken.text.replace(other.listReplaceTask, '');
        for (let q = inlineQueue.length - 1; q >= 0; q--) {
          if (other.listIsTask.test(inlineQueue[q].src)) {
            inlineQueue[q].src = inlineQueue[q].src.replace(other.listReplaceTask, '');
            break;
          }
        }

        const taskRaw = other.listTaskCheckbox.exec(item.raw);
        if (taskRaw) {
          const checkboxToken = {
            type: 'checkbox',
            raw: taskRaw[0] + ' ',
            checked: taskRaw[0] !== '[ ]',
          };
          item.checked = checkboxToken.checked;
          if (listToken.loose) {
            if (item.tokens[0] !== undefined && (item.tokens[0].type === 'paragraph' || item.tokens[0].type === 'text') && item.tokens[0].tokens) {
              item.tokens[0].raw = checkboxToken.raw + item.tokens[0].raw;
              item.tokens[0].text = checkboxToken.raw + item.tokens[0].text;
              item.tokens[0].tokens.unshift(checkboxToken);
            } else {
              item.tokens.unshift({
                type: 'paragraph',
                raw: checkboxToken.raw,
                text: checkboxToken.raw,
                tokens: [checkboxToken],
              });
            }
          } else {
            item.tokens.unshift(checkboxToken);
          }
        }
      } else if (item.task) {
        item.task = false;
      }
    }

    if (listToken.loose) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        item.loose = true;
        for (let t = 0; t < item.tokens.length; t++) {
          if (item.tokens[t].type === 'text') {
            item.tokens[t].type = 'paragraph';
          }
        }
      }
    }

    return listToken;
  }
}

function tHtml(src) {
  const cap = html.exec(src);
  if (cap) {
    const raw = trimTrailingBlankLines(cap[0]);
    return {
      type: 'html',
      block: true,
      raw,
      pre: cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style',
      text: raw,
    };
  }
}

function tDef(src) {
  const cap = def.exec(src);
  if (cap) {
    if (!other.startAngleBracket.test(cap[2]) && findClosingBracket(cap[2], '()') !== -1) {
      return;
    }
    const tagName = normalizeLabel(cap[1]);
    const href = cap[2] ? cap[2].replace(other.hrefBrackets, '$1').replace(anyPunctuation, '$1') : '';
    const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(anyPunctuation, '$1') : cap[3];
    return {
      type: 'def',
      tag: tagName,
      raw: rtrim(cap[0], '\n'),
      href,
      title,
    };
  }
}

function tTable(src) {
  const cap = gfmTable.exec(src);
  if (!cap) {
    return;
  }
  if (!other.tableDelimiter.test(cap[2])) {
    return;
  }

  const headers = splitCells(cap[1]);
  const aligns = cap[2].replace(other.tableAlignChars, '').split('|');
  const rows = cap[3]?.trim() ? cap[3].replace(other.tableRowBlankLine, '').split('\n') : [];

  const item = {
    type: 'table',
    raw: rtrim(cap[0], '\n'),
    header: [],
    align: [],
    rows: [],
  };

  if (headers.length !== aligns.length) {
    return;
  }

  for (const align of aligns) {
    if (other.tableAlignRight.test(align)) {
      item.align.push('right');
    } else if (other.tableAlignCenter.test(align)) {
      item.align.push('center');
    } else if (other.tableAlignLeft.test(align)) {
      item.align.push('left');
    } else {
      item.align.push(null);
    }
  }

  for (let i = 0; i < headers.length; i++) {
    item.header.push({
      text: headers[i],
      tokens: inline(headers[i]),
      header: true,
      align: item.align[i],
    });
  }

  for (const row of rows) {
    item.rows.push(splitCells(row, item.header.length).map((cell, i) => ({
      text: cell,
      tokens: inline(cell),
      header: false,
      align: item.align[i],
    })));
  }

  return item;
}

function tLheading(src) {
  const cap = lheading.exec(src);
  if (cap) {
    const text = cap[1].trim();
    return {
      type: 'heading',
      raw: rtrim(cap[0], '\n'),
      depth: cap[2].charAt(0) === '=' ? 1 : 2,
      text,
      tokens: inline(text),
    };
  }
}

function tParagraph(src) {
  const cap = paragraph.exec(src);
  if (cap) {
    const text = cap[1].charAt(cap[1].length - 1) === '\n' ? cap[1].slice(0, -1) : cap[1];
    return {
      type: 'paragraph',
      raw: cap[0],
      text,
      tokens: inline(text),
    };
  }
}

function tText(src) {
  const cap = blockText.exec(src);
  if (cap) {
    return {
      type: 'text',
      raw: cap[0],
      text: cap[0],
      tokens: inline(cap[0]),
    };
  }
}

/* ------------------------------------------------------ block dispatch ----- */

/** The first line of `src`, without its line end. */
function lineEnd(src) {
  const i = src.indexOf('\n');
  return i === -1 ? src : src.slice(0, i);
}

/**
 * Could a GFM table start here? Its delimiter row must be the second line and
 * may hold only spaces, tabs, pipes, colons and dashes, with at least one dash.
 */
function looksLikeTable(src) {
  const nl = src.indexOf('\n');
  if (nl === -1) return false;
  // header line: at least one non-space character before the newline
  let h = 0;
  while (h < nl && src.charCodeAt(h) === 32) h++;
  if (h === nl) return false;
  let i = nl + 1;
  let sawDash = false;
  for (; i < src.length; i++) {
    const c = src.charCodeAt(i);
    if (c === 45) {
      sawDash = true;
    } else if (c !== 32 && c !== 9 && c !== 124 && c !== 58) {
      break;
    }
  }
  if (!sawDash) return false;
  return i >= src.length || src.charCodeAt(i) === 10;
}

/**
 * Could a setext heading start here? Its underline is a line holding only '='
 * or '-' with at most three spaces of indent, and it comes before the first
 * blank line of the block.
 */
function looksLikeLheading(src) {
  let i = src.indexOf('\n');
  if (i === -1) return false;
  while (i !== -1 && i < src.length) {
    let j = i + 1;
    let sp = 0;
    while (sp < 4 && src.charCodeAt(j) === 32) {
      sp++;
      j++;
    }
    if (sp > 3) {
      i = src.indexOf('\n', j);
      continue;
    }
    const c = src.charCodeAt(j);
    if (c === 10) return false; // blank line ends the block
    if (c === 61 || c === 45) {
      let k = j;
      while (k < src.length && src.charCodeAt(k) === c) k++;
      let m = k;
      while (m < src.length) {
        const d = src.charCodeAt(m);
        if (d !== 32 && d !== 9) break;
        m++;
      }
      if (m >= src.length || src.charCodeAt(m) === 10) return true;
    }
    i = src.indexOf('\n', j);
  }
  return false;
}

function blockTokens(src, tokens = [], lastParagraphClipped = false) {
  let srcLength = Infinity;
  while (src) {
    if (src.length < srcLength) {
      srcLength = src.length;
    } else {
      throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }

    let token;
    let c = src.charCodeAt(0);

    // blank / whitespace-led lines
    if (c === 10 || c === 32 || c === 9) {
      if (token = tSpace(src)) {
        src = src.substring(token.raw.length);
        const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
        if (token.raw.length === 1 && lastToken !== undefined) {
          lastToken.raw += '\n';
        } else {
          tokens.push(token);
        }
        continue;
      }
      let i = 0;
      while (i < 4 && src.charCodeAt(i) === 32) i++;
      if (i === 4 || src.charCodeAt(i) === 9) {
        if (token = tCode(src)) {
          src = src.substring(token.raw.length);
          const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
          if (lastToken !== undefined && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
            lastToken.raw += (lastToken.raw.endsWith('\n') ? '' : '\n') + token.raw;
            lastToken.text += '\n' + token.text;
            inlineQueue[inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (looksLikeTable(src) && (token = tTable(src))) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (state.top && (token = tParagraph(src))) {
          const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
          if (lastParagraphClipped && lastToken !== undefined && lastToken.type === 'paragraph') {
            lastToken.raw += (lastToken.raw.endsWith('\n') ? '' : '\n') + token.raw;
            lastToken.text += '\n' + token.text;
            inlineQueue.pop();
            inlineQueue[inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          lastParagraphClipped = false;
          src = src.substring(token.raw.length);
          continue;
        }
        if (token = tText(src)) {
          src = src.substring(token.raw.length);
          const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
          if (lastToken !== undefined && lastToken.type === 'text') {
            lastToken.raw += (lastToken.raw.endsWith('\n') ? '' : '\n') + token.raw;
            lastToken.text += '\n' + token.text;
            inlineQueue.pop();
            inlineQueue[inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
      }
      c = src.charCodeAt(i);
    }

    switch (c) {
      case 96: // `
      case 126: // ~
        if (token = tFences(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        break;
      case 35: // #
        if (token = tHeading(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        break;
      case 62: // >
        if (token = tBlockquote(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        break;
      case 60: // <
        if (token = tHtml(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        break;
      case 91: // [
        if (token = tDef(src)) {
          src = src.substring(token.raw.length);
          const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
          if (lastToken !== undefined && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
            lastToken.raw += (lastToken.raw.endsWith('\n') ? '' : '\n') + token.raw;
            lastToken.text += '\n' + token.raw;
            inlineQueue[inlineQueue.length - 1].src = lastToken.text;
          } else {
            if (!links[token.tag]) {
              links[token.tag] = { href: token.href, title: token.title };
            }
            tokens.push(token);
          }
          continue;
        }
        break;
      case 42: // *
      case 43: // +
      case 45: // -
        if (token = tHr(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = tList(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        break;
      case 95: // _
        if (token = tHr(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        break;
      default:
        if (c >= 48 && c <= 57) { // digits: ordered list marker
          if (token = tList(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }
        }
        break;
    }

    if (looksLikeTable(src) && (token = tTable(src))) {
      src = src.substring(token.raw.length);
      tokens.push(token);
      continue;
    }

    if (looksLikeLheading(src) && (token = tLheading(src))) {
      src = src.substring(token.raw.length);
      tokens.push(token);
      continue;
    }

    if (state.top && (token = tParagraph(src))) {
      const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
      if (lastParagraphClipped && lastToken !== undefined && lastToken.type === 'paragraph') {
        lastToken.raw += (lastToken.raw.endsWith('\n') ? '' : '\n') + token.raw;
        lastToken.text += '\n' + token.text;
        inlineQueue.pop();
        inlineQueue[inlineQueue.length - 1].src = lastToken.text;
      } else {
        tokens.push(token);
      }
      lastParagraphClipped = false;
      src = src.substring(token.raw.length);
      continue;
    }

    if (token = tText(src)) {
      src = src.substring(token.raw.length);
      const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
      if (lastToken !== undefined && lastToken.type === 'text') {
        lastToken.raw += (lastToken.raw.endsWith('\n') ? '' : '\n') + token.raw;
        lastToken.text += '\n' + token.text;
        inlineQueue.pop();
        inlineQueue[inlineQueue.length - 1].src = lastToken.text;
      } else {
        tokens.push(token);
      }
      continue;
    }

    throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
  }

  state.top = true;
  return tokens;
}

/* ------------------------------------------------------- inline tokening -- */

function inline(src, tokens = []) {
  inlineQueue.push({ src, tokens });
  return tokens;
}

/* ------------------------------------------------------ inline tokenizer -- */

function outputLink(cap, linkObj, raw) {
  const href = linkObj.href;
  const title = linkObj.title || null;
  const text = cap[1].replace(other.outputLinkReplace, '$1');
  const isImage = cap[0].charAt(0) === '!';

  const outerInLink = state.inLink;
  const outerLinkEmitted = state.linkEmitted;
  const outerInRawBlock = state.inRawBlock;
  state.inLink = true;
  state.linkEmitted = false;
  const tokens = inlineTokens(text);
  const textHasLink = state.linkEmitted;
  state.linkEmitted = outerLinkEmitted;
  state.inLink = outerInLink;

  if (!isImage) {
    if (textHasLink) {
      state.inRawBlock = outerInRawBlock;
      return;
    }
    state.linkEmitted = true;
  }

  return {
    type: isImage ? 'image' : 'link',
    raw,
    href,
    title,
    text,
    tokens,
  };
}

function isLabelEndInsideToken(src, label, labelStart) {
  if (!label.includes('<')) {
    return false;
  }
  for (let i = 0; i < label.length; i++) {
    if (label[i] === '\\') {
      i++;
      continue;
    }
    if (label[i] === '`') {
      const code = inlineCode.exec(label.slice(i));
      if (code) {
        i += code[0].length - 1;
        continue;
      }
    }
    if (label[i] !== '<') {
      continue;
    }
    const tokenSrc = src.slice(labelStart + i);
    const token = tag.exec(tokenSrc) || autolink.exec(tokenSrc);
    if (!token) {
      continue;
    }
    if (token[0].length > label.length - i) {
      return true;
    }
    i += token[0].length - 1;
  }
  return false;
}

function tEscape(src) {
  const cap = escape.exec(src);
  if (cap) {
    return { type: 'escape', raw: cap[0], text: cap[1] };
  }
}

function tTag(src) {
  const cap = tag.exec(src);
  if (cap) {
    if (!state.inLink && other.startATag.test(cap[0])) {
      state.inLink = true;
    } else if (state.inLink && other.endATag.test(cap[0])) {
      state.inLink = false;
    }
    if (!state.inRawBlock && other.startPreScriptTag.test(cap[0])) {
      state.inRawBlock = true;
    } else if (state.inRawBlock && other.endPreScriptTag.test(cap[0])) {
      state.inRawBlock = false;
    }
    return {
      type: 'html',
      raw: cap[0],
      inLink: state.inLink,
      inRawBlock: state.inRawBlock,
      block: false,
      text: cap[0],
    };
  }
}

function tLink(src) {
  if (state.linkParenPossible === false) {
    return;
  }
  const cap = link.exec(src);
  if (cap) {
    const labelStart = cap[0].charAt(0) === '!' ? 2 : 1;
    if (isLabelEndInsideToken(src, cap[1], labelStart)) {
      return;
    }

    const trimmedUrl = cap[2].trim();
    if (other.startAngleBracket.test(trimmedUrl)) {
      if (!other.endAngleBracket.test(trimmedUrl)) {
        return;
      }
      const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), '\\');
      if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
        return;
      }
    } else {
      const lastParenIndex = findClosingBracket(cap[2], '()');
      if (lastParenIndex === -2) {
        return;
      }
      if (lastParenIndex > -1) {
        const start = cap[0].indexOf('!') === 0 ? 5 : 4;
        const linkLen = start + cap[1].length + lastParenIndex;
        cap[2] = cap[2].substring(0, lastParenIndex);
        cap[0] = cap[0].substring(0, linkLen).trim();
        cap[3] = '';
      }
    }
    const unescaped = rtrim(cap[0].slice(0, -1), '\\');
    if ((cap[0].length - unescaped.length) % 2 === 0) {
      return;
    }
    let href = cap[2];
    let title = '';
    title = cap[3] ? cap[3].slice(1, -1) : '';

    href = href.trim();
    if (other.startAngleBracket.test(href)) {
      href = href.slice(1, -1);
    }
    return outputLink(cap, {
      href: href ? href.replace(anyPunctuation, '$1') : href,
      title: title ? title.replace(anyPunctuation, '$1') : title,
    }, cap[0]);
  }
}

function tReflink(src) {
  let cap;
  if ((cap = reflink.exec(src)) || (cap = nolink.exec(src))) {
    const labelStart = cap[0].charAt(0) === '!' ? 2 : 1;
    if (isLabelEndInsideToken(src, cap[1], labelStart)) {
      return;
    }
    const linkObj = links[normalizeLabel(cap[2] || cap[1])];
    if (!linkObj) {
      const text = cap[0].charAt(0);
      return { type: 'text', raw: text, text };
    }
    return outputLink(cap, linkObj, cap[0]);
  }
}

function tEmStrong(src, maskedSrc, prevChar) {
  let match = emStrongLDelim.exec(src);
  if (!match) return;
  if (!match[1] && !match[2] && !match[3] && !match[4]) return;

  const delimChar = match[0][0];
  const midRun = prevChar === delimChar;

  const srcStart = maskedSrc.length - src.length;
  let runStart = srcStart;
  while (runStart > 0 && maskedSrc[runStart - 1] === delimChar) {
    runStart--;
  }
  const runPrevChar = maskedSrc.slice(Math.max(0, runStart - 2), runStart).slice(-1);
  const runPrevPunct = runPrevChar === '*' || runPrevChar === '_' || !!punctuation.exec(runPrevChar);
  if (runStart < srcStart) {
    prevChar = runPrevChar;
  }
  const prevPunct = runStart < srcStart ? runPrevPunct : !!punctuation.exec(prevChar);

  if (match[4] && other.unicodeAlphaNumeric.test(prevChar)) return;

  const nextChar = match[1] || match[3] || '';

  if (!nextChar || !prevChar || prevPunct) {
    const lLength = cpLength(match[0]) - 1;
    let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;

    const runLength = srcStart - runStart + lLength;
    const openerCanClose = !!runPrevChar.trim()
      && (!!nextChar || (delimChar === '*' && !runPrevPunct));
    if (delimChar !== '*' && delimChar !== '_') return;
    const endReg = delimChar === '*' ? emStrongRDelimAst : emStrongRDelimUnd;
    const lastPossibleEmStrongCloserIndex = lastEmCloserIndex(maskedSrc, delimChar);
    const emStrongCloserWindowStart = maskedSrc.length - src.length + lLength;
    if (lastPossibleEmStrongCloserIndex < emStrongCloserWindowStart) return;
    maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
    const lastPossibleEmStrongCloserIndexInWindow = lastPossibleEmStrongCloserIndex - emStrongCloserWindowStart;
    endReg.lastIndex = 0;

    while ((match = endReg.exec(maskedSrc)) !== null) {
      if (match.index > lastPossibleEmStrongCloserIndexInWindow) break;
      rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];

      if (!rDelim) continue;

      rLength = cpLength(rDelim);

      if (match[3] || match[4]) {
        delimTotal += rLength;
        continue;
      } else if (match[5] || match[6] || openerCanClose) {
        if (midRun && (match[5] || match[6])) {
          break;
        }
        if (runLength % 3 && !((runLength + rLength) % 3)) {
          midDelimTotal += rLength;
          continue;
        }
      }

      delimTotal -= rLength;

      if (delimTotal > 0) continue;

      rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
      const lastCharLength = firstCharLength(match[0]);
      const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);

      if (Math.min(lLength, rLength) % 2) {
        const text = raw.slice(1, -1);
        return { type: 'em', raw, text, tokens: inlineTokens(text) };
      }

      const text = raw.slice(2, -2);
      return { type: 'strong', raw, text, tokens: inlineTokens(text) };
    }
  }
}

function tCodespan(src) {
  const cap = inlineCode.exec(src);
  if (cap) {
    let text = cap[2].replace(other.newLineCharGlobal, ' ');
    const hasNonSpaceChars = other.nonSpaceChar.test(text);
    const hasSpaceCharsOnBothEnds = other.startingSpaceChar.test(text) && other.endingSpaceChar.test(text);
    if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
      text = text.substring(1, text.length - 1);
    }
    return { type: 'codespan', raw: cap[0], text };
  }
}

function tBr(src) {
  const cap = br.exec(src);
  if (cap) {
    return { type: 'br', raw: cap[0] };
  }
}

function tDel(src, maskedSrc, prevChar) {
  let match = delLDelim.exec(src);
  if (!match) return;

  const nextChar = match[1] || '';

  if (!nextChar || !prevChar || punctuation.exec(prevChar)) {
    const lLength = cpLength(match[0]) - 1;
    let rDelim, rLength, delimTotal = lLength;

    const endReg = delRDelim;
    const lastPossibleDelCloserIndex = lastDelCloserIndex(maskedSrc);
    const delCloserWindowStart = maskedSrc.length - src.length + lLength;
    if (lastPossibleDelCloserIndex < delCloserWindowStart) return;
    maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
    const lastPossibleDelCloserIndexInWindow = lastPossibleDelCloserIndex - delCloserWindowStart;
    endReg.lastIndex = 0;

    while ((match = endReg.exec(maskedSrc)) !== null) {
      if (match.index > lastPossibleDelCloserIndexInWindow) break;
      rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];

      if (!rDelim) continue;

      rLength = cpLength(rDelim);

      if (rLength !== lLength) continue;

      if (match[3] || match[4]) {
        delimTotal += rLength;
        continue;
      }

      delimTotal -= rLength;

      if (delimTotal > 0) continue;

      rLength = Math.min(rLength, rLength + delimTotal);
      const lastCharLength = firstCharLength(match[0]);
      const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);

      const text = raw.slice(lLength, -lLength);
      return { type: 'del', raw, text, tokens: inlineTokens(text) };
    }
  }
}

function tAutolink(src) {
  const cap = autolink.exec(src);
  if (cap) {
    let text, href;
    if (cap[2] === '@') {
      text = cap[1];
      href = 'mailto:' + text;
    } else {
      text = cap[1];
      href = text;
    }
    return {
      type: 'link',
      raw: cap[0],
      text,
      href,
      autolink: true,
      tokens: [{ type: 'text', raw: text, text }],
    };
  }
}

function tUrl(src) {
  let cap;
  if (cap = url.exec(src)) {
    let text, href;
    if (cap[2] === '@') {
      text = cap[0];
      href = 'mailto:' + text;
    } else {
      let prevCapZero;
      do {
        prevCapZero = cap[0];
        cap[0] = _backpedal.exec(cap[0])?.[0] ?? '';
      } while (prevCapZero !== cap[0]);
      text = cap[0];
      if (cap[1] === 'www.') {
        href = 'http://' + cap[0];
      } else {
        href = cap[0];
      }
    }
    return {
      type: 'link',
      raw: cap[0],
      text,
      href,
      autolink: true,
      tokens: [{ type: 'text', raw: text, text }],
    };
  }
}

function tInlineText(src) {
  const len = inlineTextLength(src);
  const raw = len === src.length ? src : src.slice(0, len);
  const escaped = state.inRawBlock;
  return {
    type: 'text',
    raw,
    text: escaped ? raw : decodeNumericCharacterReferences(raw),
    escaped,
  };
}


/* ------------------------------------------------- inline text scanning --- */

/** Bare `http https` (case-insensitive), as in the inline-text stop set. */
function bareHttpAt(s, p) {
  const n = s.length;
  if (p + 3 >= n) return false;
  if ((s.charCodeAt(p) | 32) !== 104 || (s.charCodeAt(p + 1) | 32) !== 116
    || (s.charCodeAt(p + 2) | 32) !== 116 || (s.charCodeAt(p + 3) | 32) !== 112) return false;
  return p + 4 >= n || (s.charCodeAt(p + 4) | 32) !== 115;
}

/** `ftp://` (case-insensitive), the only protocol of the stop set followed by its slashes. */
function ftpSlashAt(s, p) {
  const n = s.length;
  if (p + 3 >= n) return false;
  if ((s.charCodeAt(p) | 32) !== 102 || (s.charCodeAt(p + 1) | 32) !== 116 || (s.charCodeAt(p + 2) | 32) !== 112) return false;
  const q = p + 3;
  return q + 2 < n && s.charCodeAt(q) === 58 && s.charCodeAt(q + 1) === 47 && s.charCodeAt(q + 2) === 47;
}

function isAlnumCode(c) {
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57);
}

/** A character of the e-mail local part class `[a-zA-Z0-9.!#$%&'*+/=?_\`{|}~-]`. */
function isEmailCode(c) {
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57)
    || c === 46 || c === 33 || c === 35 || c === 36 || c === 37 || c === 38 || c === 39
    || c === 42 || c === 43 || c === 47 || c === 61 || c === 63 || c === 95 || c === 96
    || c === 123 || c === 124 || c === 125 || c === 126 || c === 45;
}

function isJsSpaceCode(c) {
  return c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12
    || c === 0xa0 || c === 0x1680 || c === 0x2028 || c === 0x2029 || c === 0x202f
    || c === 0x205f || c === 0x3000 || c === 0xfeff || (c >= 0x2000 && c <= 0x200a);
}

/** `(?:[hH][tT][tT][pP][sS]?|[fF][tT][pP]):\/\/` at `p`. */
function protocolAt(s, p) {
  const n = s.length;
  if (p >= n) return false;
  const c = s.charCodeAt(p);
  if (c === 104 || c === 72) {
    if (p + 7 > n + 0 && p + 9 > n) { /* fallthrough length checks below */ }
    if (p + 4 >= n) return false;
    if ((s.charCodeAt(p + 1) | 32) !== 116 || (s.charCodeAt(p + 2) | 32) !== 116 || (s.charCodeAt(p + 3) | 32) !== 112) return false;
    let q = p + 4;
    if (q < n && (s.charCodeAt(q) | 32) === 115) q++;
    return q + 2 < n && s.charCodeAt(q) === 58 && s.charCodeAt(q + 1) === 47 && s.charCodeAt(q + 2) === 47;
  }
  if (c === 102 || c === 70) {
    if (p + 3 >= n) return false;
    if ((s.charCodeAt(p + 1) | 32) !== 116 || (s.charCodeAt(p + 2) | 32) !== 112) return false;
    const q = p + 3;
    return q + 2 < n && s.charCodeAt(q) === 58 && s.charCodeAt(q + 1) === 47 && s.charCodeAt(q + 2) === 47;
  }
  return false;
}

/** `(?:mailto|xmpp):` at `p` (lower case only, as in the gfm rule). */
function isMailtoAt(s, p) {
  const n = s.length;
  if (p >= n) return false;
  const c = s.charCodeAt(p);
  if (c === 109) {
    return p + 6 < n && s.charCodeAt(p + 1) === 97 && s.charCodeAt(p + 2) === 105
      && s.charCodeAt(p + 3) === 108 && s.charCodeAt(p + 4) === 116 && s.charCodeAt(p + 5) === 111
      && s.charCodeAt(p + 6) === 58;
  }
  if (c === 120) {
    return p + 4 < n && s.charCodeAt(p + 1) === 109 && s.charCodeAt(p + 2) === 112
      && s.charCodeAt(p + 3) === 112 && s.charCodeAt(p + 4) === 58;
  }
  return false;
}

/** `[a-zA-Z0-9.!#$%&'*+/=?_\`{|}~-]+@` at `p`. */
function emailAt(s, p) {
  const n = s.length;
  let j = p;
  while (j < n && isEmailCode(s.charCodeAt(j))) j++;
  return j > p && j < n && s.charCodeAt(j) === 64;
}

/** ` {2,}\n` at `p`. */
function isHardBreakAt(s, p) {
  const n = s.length;
  let j = p;
  while (j < n && s.charCodeAt(j) === 32) j++;
  return j - p >= 2 && j < n && s.charCodeAt(j) === 10;
}

/** `(?<![^\s*_~(])www\.` at `p`. */
function isWwwStart(s, p) {
  const n = s.length;
  if (p + 3 >= n) return false;
  if (s.charCodeAt(p) !== 119 || s.charCodeAt(p + 1) !== 119 || s.charCodeAt(p + 2) !== 119 || s.charCodeAt(p + 3) !== 46) return false;
  if (p === 0) return true;
  const c = s.charCodeAt(p - 1);
  return isJsSpaceCode(c) || c === 42 || c === 95 || c === 126 || c === 40;
}

/** Characters the inline-text stop set never starts with: ASCII letters, digits and the e-mail
 *  local-part punctuation that is not itself a stop. 1 means "nothing can begin here". */
const TEXT_PLAIN = new Uint8Array(128);
for (let i = 48; i <= 57; i++) TEXT_PLAIN[i] = 1;
for (let i = 65; i <= 90; i++) TEXT_PLAIN[i] = 1;
for (let i = 97; i <= 122; i++) TEXT_PLAIN[i] = 1;
for (const c of [35, 36, 37, 38, 39, 43, 45, 46, 47, 61, 63, 123, 124, 125]) TEXT_PLAIN[c] = 1;
// h, H, f, F open a protocol and w opens "www.": those four letters are checked.
TEXT_PLAIN[72] = 0; TEXT_PLAIN[70] = 0; TEXT_PLAIN[104] = 0; TEXT_PLAIN[102] = 0; TEXT_PLAIN[119] = 0;

/**
 * How many characters marked's gfm inline-text rule consumes at the start of
 * `src`, i.e. the length of `rules.inline.gfm.text.exec(src)[0]`.
 */
function inlineTextLength(src) {
  const n = src.length;
  const c0 = src.charCodeAt(0);

  // A single non-alphanumeric character ending right before a protocol.
  if (!isAlnumCode(c0) && isMailtoAt(src, 1)) return 1;

  let q = 1;
  if (c0 === 96) {
    while (q < n && src.charCodeAt(q) === 96) q++;
  } else if (c0 === 126) {
    while (q < n && src.charCodeAt(q) === 126) q++;
  }

  if (q < n) {
    const c = src.charCodeAt(q);
    if (c === 96 || c === 126) return q;
    if (c === 32 && isHardBreakAt(src, q)) return q;
    if (emailAt(src, q)) return q;
  }

  for (let p = q; p < n; p++) {
    const c = src.charCodeAt(p);
    // The great majority of characters in prose start nothing at all: a single
    // table lookup skips them, and every character the table does not skip
    // falls through to the checks below unchanged.
    if (c < 128 && TEXT_PLAIN[c] === 1) continue;
    if (c === 32) {
      if (isHardBreakAt(src, p)) return p;
      if (isMailtoAt(src, p + 1) || emailAt(src, p + 1)) return p + 1;
      continue;
    }
    if (c === 92 || c === 60 || c === 33 || c === 91 || c === 96 || c === 42 || c === 126 || c === 95) return p;
    if ((c === 104 || c === 72 || c === 102 || c === 70) && protocolAt(src, p)) return p;
    if (c === 119 && p > 0 && isWwwStart(src, p)) return p;
    if (p + 1 < n && src.charCodeAt(p + 1) === 32 && isHardBreakAt(src, p + 1)) return p + 1;
    if (!isAlnumCode(c) && isMailtoAt(src, p + 1)) return p + 1;
    if (!isEmailCode(c) && emailAt(src, p + 1)) return p + 1;
  }
  return n;
}

/* ------------------------------------------------------------- masking ---- */

function linkInText(text) {
  if (!text.includes('[')) {
    return false;
  }

  for (const match of text.matchAll(blockSkip)) {
    if (link.test(match[0]) && text.charAt(match.index - 1) !== '!') {
      return true;
    }
  }

  for (const match of text.matchAll(reflinkSearch)) {
    const match0 = match[0];
    const refStart = match0.lastIndexOf('[');
    if (match0.charAt(0) === '!' || !Object.hasOwn(links, normalizeLabel(match0.slice(refStart + 1, -1)))) {
      continue;
    }
    if (refStart > 1 && linkInText(match0.slice(1, refStart - 1))) {
      continue;
    }
    return true;
  }

  return false;
}

function maskSrc(src) {
  let maskedSrc = src;

  if (src.indexOf('[') !== -1) {
    const maskReflink = (match0) => {
      const refStart = match0.lastIndexOf('[');
      if (!Object.hasOwn(links, normalizeLabel(match0.slice(refStart + 1, -1)))) {
        return match0;
      }
      if (refStart > 1 && match0.charAt(0) !== '!') {
        const text = match0.slice(1, refStart - 1);
        if (linkInText(text)) {
          return '[' + text.replace(reflinkSearch, maskReflink)
            + '][' + 'a'.repeat(match0.length - refStart - 2) + ']';
        }
      }
      return '[' + 'a'.repeat(match0.length - 2) + ']';
    };
    maskedSrc = maskedSrc.replace(reflinkSearch, maskReflink);
  }

  if (maskedSrc.indexOf('\\') !== -1 || maskedSrc.indexOf('`') !== -1) {
    maskedSrc = maskedSrc.replace(anyPunctuationOutsideCode, (match0, code, punct) => {
      if (punct) {
        return '+'.repeat(match0.length);
      }
      if (code) {
        return code + match0.slice(code.length, -code.length).replace(/`/g, '+') + code;
      }
      return match0;
    });
  }

  if (maskedSrc.indexOf('[') !== -1 || maskedSrc.indexOf('<') !== -1 || maskedSrc.indexOf('`') !== -1) {
    maskedSrc = maskedSrc.replace(blockSkip, (match0, _link, context) => {
      const offset = context ? context.length : 0;
      return match0.slice(0, offset) + '[' + 'a'.repeat(match0.length - offset - 2) + ']';
    });
  }

  return maskedSrc;
}


/**
 * True when an inline run holds no construct at all: no escape, tag, link,
 * image, emphasis, strikethrough, code span, character reference, protocol or
 * www autolink, e-mail autolink or hard break. Such a run is one text token,
 * so masking, closer scanning and the token loop can all be skipped.
 */
function isPlainInline(s) {
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const c = s.charCodeAt(i);
    if (c === 92 || c === 60 || c === 91 || c === 93 || c === 33 || c === 42
      || c === 95 || c === 126 || c === 96 || c === 38 || c === 64 || c === 58) {
      return false;
    }
    if (c === 32 && i + 1 < n && s.charCodeAt(i + 1) === 32) {
      return false;
    }
    if (c === 10 && i > 0 && s.charCodeAt(i - 1) === 32) {
      return false;
    }
  }
  return s.indexOf('www.') === -1;
}

/* --------------------------------------------------------- inline loop ---- */

function inlineTokens(src, tokens = []) {
  if (src.length > 0 && isPlainInline(src)) {
    tokens.push({ type: 'text', raw: src, text: src, escaped: state.inRawBlock });
    return tokens;
  }
  const prevLinkParenPossible = state.linkParenPossible;
  state.linkParenPossible = prevLinkParenPossible && src.includes(')');
  try {
    let maskedSrc = src;
    if (src.indexOf('*') !== -1 || src.indexOf('_') !== -1 || src.indexOf('~') !== -1) {
      maskedSrc = maskSrc(src);
    }
    pushHints(maskedSrc);
    try {
      return tokenizeInlines(src, maskedSrc, tokens);
    } finally {
      popHints();
    }
  } finally {
    state.linkParenPossible = prevLinkParenPossible;
  }
}

function tokenizeInlines(src, maskedSrc, tokens) {
  let keepPrevChar = false;
  let prevChar = '';
  let srcLength = Infinity;

  while (src.length > 0) {
    if (src.length < srcLength) {
      srcLength = src.length;
    } else {
      throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }

    if (!keepPrevChar) {
      prevChar = '';
    }
    keepPrevChar = false;

    let token;
    const c = src.charCodeAt(0);
    const c1 = src.length > 1 ? src.charCodeAt(1) : -1;

    switch (c) {
      case 92: // backslash
        if (token = tEscape(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          break;
        }
        if (token = tBr(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          break;
        }
        break;
      case 60: // <
        if (token = tTag(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          break;
        }
        if (token = tAutolink(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          break;
        }
        break;
      case 91: // [
      case 33: // ! (image)
        if (c !== 33 || c1 === 91) {
          if (token = tLink(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            break;
          }
          if (token = tReflink(src)) {
            src = src.substring(token.raw.length);
            const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
            if (token.type === 'text' && lastToken !== undefined && lastToken.type === 'text') {
              lastToken.raw += token.raw;
              lastToken.text += token.text;
            } else {
              tokens.push(token);
            }
            break;
          }
        }
        break;
      case 42: // *
      case 95: // _
        if (token = tEmStrong(src, maskedSrc, prevChar)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          break;
        }
        break;
      case 96: // `
        if (token = tCodespan(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          break;
        }
        break;
      case 32: // space
        if (token = tBr(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          break;
        }
        break;
      case 126: // ~
        if (token = tDel(src, maskedSrc, prevChar)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          break;
        }
        break;
      default:
        // gfm extended url: a protocol, "www.", or an e-mail address
        if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57)
          || c === 46 || c === 95 || c === 43 || c === 45) {
          if (!state.inLink && (token = tUrl(src))) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            break;
          }
        }
        break;
    }

    if (token && src.length === srcLength) {
      // a token that consumed nothing would loop forever; the guard above catches it
    }

    if (token !== undefined && src.length < srcLength) {
      continue;
    }

    if (token = tInlineText(src)) {
      src = src.substring(token.raw.length);
      if (token.raw.slice(-1) !== '_') {
        prevChar = token.raw.slice(-1);
      }
      keepPrevChar = true;
      const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
      if (lastToken !== undefined && lastToken.type === 'text') {
        lastToken.raw += token.raw;
        lastToken.text += token.text;
      } else {
        tokens.push(token);
      }
      continue;
    }

    throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
  }

  return tokens;
}

/* ------------------------------------------------------------- renderer --- */

function renderCode(t) {
  const langString = (t.lang || '').match(other.notSpaceStart)?.[0];
  const code = t.text ? t.text.replace(other.endingNewline, '') + '\n' : '';
  if (!langString) {
    return '<pre><code>' + escapeHtmlEntities(code, true) + '</code></pre>\n';
  }
  return '<pre><code class="language-' + escapeHtmlEntities(langString) + '">'
    + escapeHtmlEntities(code, true) + '</code></pre>\n';
}

function renderTable(t) {
  let header = '';
  let cell = '';
  for (let j = 0; j < t.header.length; j++) {
    cell += renderTableCell(t.header[j]);
  }
  header += '<tr>\n' + cell + '</tr>\n';

  let body = '';
  for (let j = 0; j < t.rows.length; j++) {
    const row = t.rows[j];
    cell = '';
    for (let k = 0; k < row.length; k++) {
      cell += renderTableCell(row[k]);
    }
    body += '<tr>\n' + cell + '</tr>\n';
  }
  if (body) body = `<tbody>${body}</tbody>`;

  return '<table>\n<thead>\n' + header + '</thead>\n' + body + '</table>\n';
}

function renderTableCell(t) {
  const content = renderInline(t.tokens);
  const type = t.header ? 'th' : 'td';
  const tagName = t.align ? `<${type} align="${t.align}">` : `<${type}>`;
  return tagName + content + `</${type}>\n`;
}

function renderList(t) {
  const ordered = t.ordered;
  const start = t.start;
  let body = '';
  for (let j = 0; j < t.items.length; j++) {
    body += '<li>' + renderTokens(t.items[j].tokens) + '</li>\n';
  }
  const type = ordered ? 'ol' : 'ul';
  const startAttr = (ordered && start !== 1) ? (' start="' + start + '"') : '';
  return '<' + type + startAttr + '>\n' + body + '</' + type + '>\n';
}

function renderTokens(tokens) {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    switch (t.type) {
      case 'space':
        break;
      case 'hr':
        out += '<hr>\n';
        break;
      case 'heading':
        out += `<h${t.depth}>${renderInline(t.tokens)}</h${t.depth}>\n`;
        break;
      case 'code':
        out += renderCode(t);
        break;
      case 'table':
        out += renderTable(t);
        break;
      case 'blockquote':
        out += `<blockquote>\n${renderTokens(t.tokens)}</blockquote>\n`;
        break;
      case 'list':
        out += renderList(t);
        break;
      case 'checkbox':
        out += '<input ' + (t.checked ? 'checked="" ' : '') + 'disabled="" type="checkbox"> ';
        break;
      case 'html':
        out += t.text;
        break;
      case 'def':
        break;
      case 'paragraph':
        out += `<p>${renderInline(t.tokens)}</p>\n`;
        break;
      case 'text':
        out += t.tokens ? renderInline(t.tokens) : (t.escaped ? t.text : escapeHtmlEntities(t.text));
        break;
      default:
        throw new Error('Token with "' + t.type + '" type was not found.');
    }
  }
  return out;
}

function renderInline(tokens) {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    switch (t.type) {
      case 'escape':
      case 'text':
        out += t.tokens ? renderInline(t.tokens) : (t.escaped ? t.text : escapeHtmlEntities(t.text));
        break;
      case 'html':
        out += t.text;
        break;
      case 'link':
        out += renderLink(t);
        break;
      case 'image':
        out += renderImage(t);
        break;
      case 'checkbox':
        out += '<input ' + (t.checked ? 'checked="" ' : '') + 'disabled="" type="checkbox"> ';
        break;
      case 'strong':
        out += `<strong>${renderInline(t.tokens)}</strong>`;
        break;
      case 'em':
        out += `<em>${renderInline(t.tokens)}</em>`;
        break;
      case 'codespan':
        out += `<code>${escapeHtmlEntities(t.text, true)}</code>`;
        break;
      case 'br':
        out += '<br>';
        break;
      case 'del':
        out += `<del>${renderInline(t.tokens)}</del>`;
        break;
      default:
        throw new Error('Token with "' + t.type + '" type was not found.');
    }
  }
  return out;
}

function renderLink(t) {
  const parsedText = t.autolink ? escapeHtmlEntities(t.text, true) : renderInline(t.tokens);
  const cleanHref = cleanUrl(t.href);
  if (cleanHref === null) {
    return parsedText;
  }
  const href = escapeHtmlEntities(cleanHref, t.autolink);
  let out = '<a href="' + href + '"';
  if (t.title) {
    out += ' title="' + escapeHtmlEntities(t.title) + '"';
  }
  return out + '>' + parsedText + '</a>';
}

function renderImage(t) {
  let text = t.text;
  if (t.tokens) {
    text = renderPlainInline(t.tokens);
  }
  const cleanHref = cleanUrl(t.href);
  if (cleanHref === null) {
    return escapeHtmlEntities(text);
  }
  let out = `<img src="${escapeHtmlEntities(cleanHref)}" alt="${escapeHtmlEntities(text)}"`;
  if (t.title) {
    out += ` title="${escapeHtmlEntities(t.title)}"`;
  }
  return out + '>';
}

function renderPlainInline(tokens) {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    switch (t.type) {
      case 'escape':
      case 'codespan':
      case 'html':
        out += t.text;
        break;
      case 'text':
        out += t.tokens ? renderPlainInline(t.tokens) : t.text;
        break;
      case 'link':
      case 'image':
        out += t.tokens ? renderPlainInline(t.tokens) : t.text;
        break;
      case 'strong':
      case 'em':
      case 'del':
        out += t.tokens ? renderPlainInline(t.tokens) : t.text;
        break;
      case 'br':
        break;
      case 'checkbox':
        out += t.raw;
        break;
      case 'space':
        break;
      default:
        break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ parse -- */

const blockquoteRule = edit(/^( {0,3}> ?(?:(?![ \t]*(?:\n|$))(paragraph)|[^\n]*)(?:\n|$))+/)
  .replace('paragraph', edit(_paragraph)
    .replace('hr', hr)
    .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
    .replace('|lheading', '')
    .replace('|table', '')
    .replace('blockquote', ' {0,3}>')
    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)')
    .replace('list', ' {0,3}(?:[*+-]|\\d{1,9}[.)])(?:[ \\t]|\\n|$)')
    .replace('html', ' {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)')
    .replace('tag', _tag)
    .getRegex())
  .getRegex();

/**
 * Render `markdown` exactly as marked 18.1.3 does with its default options.
 */
export function parse(markdown) {
  links = Object.create(null);
  inlineQueue = [];
  state.inLink = false;
  state.inRawBlock = false;
  state.linkEmitted = false;
  state.linkParenPossible = true;
  state.top = true;
  hintStack.length = 0;

  if (markdown.indexOf('\r') !== -1) {
    markdown = markdown.replace(other.carriageReturn, '\n');
  }

  const tokens = blockTokens(markdown, []);

  for (let i = 0; i < inlineQueue.length; i++) {
    const next = inlineQueue[i];
    state.inRawBlock = false;
    inlineTokens(next.src, next.tokens);
  }
  inlineQueue = [];

  return renderTokens(tokens);
}

/** Internal grammar table, exposed for the build-time equivalence check. */
export const __rules = {
  other,
  block: { newline, code: blockCode, fences, heading, hr, blockquote: blockquoteRule, list: listRule, html, def, table: gfmTable, lheading, paragraph, text: blockText },
  inline: { escape, code: inlineCode, br, text: inlineText, autolink, tag, link, reflink, nolink, reflinkSearch, blockSkip, anyPunctuation, anyPunctuationOutsideCode, punctuation, emStrongLDelim, emStrongRDelimAst, emStrongRDelimUnd, delLDelim, delRDelim, url, _backpedal, del },
};

/** Internal, for the build-time scanner equivalence check. */
export const __inlineTextLength = inlineTextLength;
